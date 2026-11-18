import { PrismaPg } from '@prisma/adapter-pg';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { vaciarTablas } from '../../prisma/vaciarTablas';
import { migrarBdDePrueba, urlBdDePrueba } from '../../tests/bdDePrueba';
import { PrismaClient } from '../generated/prisma/client';
import { TareaRepositorioPrisma } from './tareaRepositorioPrisma';

// Demuestra que listar tareas no tiene el problema N+1: el número de consultas a la BD es
// el mismo con 5 tareas que con 50, porque las etiquetas de todas llegan de una vez y no
// con una consulta extra por cada tarea.
describe.skipIf(!urlBdDePrueba)('listado de tareas sin N+1', () => {
  let db: PrismaClient<'query'>;
  let consultas: string[] = [];
  let responsableId: number;

  beforeAll(() => {
    // Cliente propio con el log de consultas como eventos, para poder contarlas.
    db = new PrismaClient({
      adapter: new PrismaPg({ connectionString: migrarBdDePrueba() }),
      log: [{ emit: 'event', level: 'query' }],
    });
    db.$on('query', (evento) => consultas.push(evento.query));
  }, 60_000);

  afterAll(async () => {
    await db?.$disconnect();
  });

  beforeEach(async () => {
    await vaciarTablas(db);
    responsableId = (await db.usuario.create({ data: { nombre: 'Ana', email: 'ana@test.dev' } }))
      .id;
  });

  async function crearTareas(cantidad: number) {
    const repo = new TareaRepositorioPrisma(db);
    for (let i = 0; i < cantidad; i++) {
      await repo.crear({ titulo: `Tarea ${i}`, responsableId, etiquetas: [`e${i % 3}`, 'comun'] });
    }
  }

  async function contarConsultas(accion: () => Promise<unknown>): Promise<number> {
    consultas = [];
    await accion();
    return consultas.length;
  }

  it('hace el mismo número de consultas con 5 tareas que con 50', async () => {
    const repo = new TareaRepositorioPrisma(db);
    const listar = () => repo.listar({ tamanoPagina: 100 });

    await crearTareas(5);
    const conCinco = await contarConsultas(listar);
    await crearTareas(45);
    const conCincuenta = await contarConsultas(listar);

    const listado = await listar();
    expect(listado.elementos).toHaveLength(50);
    expect(listado.elementos.every((t) => t.etiquetas.length === 2)).toBe(true);
    expect(conCincuenta).toBe(conCinco);
  });

  // Control: comprueba que el contador sí detecta un N+1 cuando lo hay. Sin esto, el test
  // anterior también pasaría si, por ejemplo, el log de consultas no estuviera funcionando.
  it('el contador detecta un N+1 en una implementación ingenua', async () => {
    const listarIngenuo = async () => {
      const tareas = await db.tarea.findMany();
      for (const tarea of tareas) {
        await db.tareaEtiqueta.findMany({ where: { tareaId: tarea.id } });
      }
    };

    await crearTareas(5);
    const conCinco = await contarConsultas(listarIngenuo);
    await crearTareas(45);
    const conCincuenta = await contarConsultas(listarIngenuo);

    expect(conCincuenta - conCinco).toBe(45);
  });
});
