import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { vaciarTablas } from '../../prisma/vaciarTablas';
import { prepararBdDePrueba, urlBdDePrueba } from '../../tests/bdDePrueba';
import type { PrismaClient } from '../generated/prisma/client';
import { TareaRepositorioPrisma } from './tareaRepositorioPrisma';

const DIA_MS = 24 * 60 * 60 * 1000;
const enDias = (dias: number) => new Date(Date.now() + dias * DIA_MS);

// Test de integración contra PostgreSQL real: se salta si no hay TEST_DATABASE_URL.
describe.skipIf(!urlBdDePrueba)('TareaRepositorioPrisma', () => {
  let db: PrismaClient;
  let repo: TareaRepositorioPrisma;
  let ana: number;
  let bruno: number;

  beforeAll(() => {
    db = prepararBdDePrueba();
    repo = new TareaRepositorioPrisma(db);
  }, 60_000);

  afterAll(async () => {
    await db?.$disconnect();
  });

  beforeEach(async () => {
    await vaciarTablas(db);
    ana = (await db.usuario.create({ data: { nombre: 'Ana', email: 'ana@test.dev' } })).id;
    bruno = (await db.usuario.create({ data: { nombre: 'Bruno', email: 'bruno@test.dev' } })).id;
  });

  async function crearVarias() {
    await repo.crear({ titulo: 'Tarea 1', prioridad: 'baja', responsableId: ana, fechaLimite: enDias(5) });
    const t2 = await repo.crear({ titulo: 'Tarea 2', prioridad: 'alta', responsableId: bruno });
    await repo.cambiarEstado(t2.id, 'en-curso');
    await repo.crear({
      titulo: 'Tarea 3',
      descripcion: 'Revisar el LOGIN',
      responsableId: ana,
      fechaLimite: enDias(1),
    });
    const t4 = await repo.crear({ titulo: 'Tarea 4', prioridad: 'alta', responsableId: ana, fechaLimite: enDias(3) });
    await repo.cambiarEstado(t4.id, 'hecha');
  }

  describe('crear y obtener', () => {
    it('guarda la tarea con sus valores por defecto y la recupera igual', async () => {
      const creada = await repo.crear({
        titulo: ' Nueva ',
        responsableId: ana,
        etiquetas: ['frontend', 'bug', 'bug'],
      });
      expect(creada).toEqual({
        id: 1,
        titulo: 'Nueva',
        descripcion: '',
        estado: 'pendiente',
        prioridad: 'media',
        responsableId: ana,
        etiquetas: ['bug', 'frontend'],
      });
      expect(await repo.obtener(creada.id)).toEqual(creada);
    });

    it('reutiliza las etiquetas que ya existen', async () => {
      await repo.crear({ titulo: 'A', responsableId: ana, etiquetas: ['backend'] });
      await repo.crear({ titulo: 'B', responsableId: ana, etiquetas: ['backend'] });
      expect(await db.etiqueta.count()).toBe(1);
    });

    it('aplica la validación del dominio antes de tocar la BD', async () => {
      await expect(repo.crear({ titulo: '', responsableId: ana })).rejects.toThrow('título');
      expect(await db.tarea.count()).toBe(0);
    });

    it('rechaza un responsable inexistente por integridad referencial', async () => {
      await expect(repo.crear({ titulo: 'Huérfana', responsableId: 999 })).rejects.toThrow();
    });

    it('devuelve undefined si la tarea no existe', async () => {
      expect(await repo.obtener(999)).toBeUndefined();
    });
  });

  describe('listar', () => {
    beforeEach(crearVarias);

    const ids = async (consulta: Parameters<TareaRepositorioPrisma['listar']>[0]) =>
      (await repo.listar(consulta)).elementos.map((t) => t.id);

    it('filtra por estado, prioridad, responsable y texto', async () => {
      expect(await ids({ filtro: { estado: 'en-curso' } })).toEqual([2]);
      expect(await ids({ filtro: { prioridad: 'alta' } })).toEqual([2, 4]);
      expect(await ids({ filtro: { responsableId: bruno } })).toEqual([2]);
      expect(await ids({ filtro: { texto: 'login' } })).toEqual([3]);
    });

    it('ordena por prioridad y por fecha límite igual que la versión en memoria', async () => {
      expect(await ids({ orden: { campo: 'prioridad', direccion: 'desc' } })).toEqual([2, 4, 3, 1]);
      expect(await ids({ orden: { campo: 'fechaLimite', direccion: 'asc' } })).toEqual([3, 4, 1, 2]);
    });

    it('pagina y devuelve el total sin paginar', async () => {
      const resultado = await repo.listar({ pagina: 2, tamanoPagina: 3 });
      expect(resultado.elementos.map((t) => t.id)).toEqual([4]);
      expect(resultado).toMatchObject({ total: 4, pagina: 2, tamanoPagina: 3 });
    });
  });

  describe('actualizar y cambiarEstado', () => {
    it('actualiza campos y reemplaza las etiquetas', async () => {
      const t = await repo.crear({ titulo: 'Original', responsableId: ana, etiquetas: ['a', 'b'] });
      const editada = await repo.actualizar(t.id, { titulo: 'Editada', etiquetas: ['c'] });
      expect(editada).toMatchObject({ titulo: 'Editada', etiquetas: ['c'] });
      expect(await repo.obtener(t.id)).toEqual(editada);
    });

    it('quita la fecha límite con null y lo deja en la auditoría', async () => {
      const fecha = enDias(2);
      const t = await repo.crear({ titulo: 'T', responsableId: ana, fechaLimite: fecha });
      const editada = await repo.actualizar(t.id, { fechaLimite: null });
      expect(editada).not.toHaveProperty('fechaLimite');
      expect((await repo.obtener(t.id))!).not.toHaveProperty('fechaLimite');

      const auditoria = await db.auditoria.findFirst({ where: { tareaId: t.id, accion: 'actualizar' } });
      expect(auditoria!.cambios).toEqual({ fechaLimite: { antes: fecha.toISOString(), despues: null } });
    });

    it('mantiene las etiquetas si no vienen en los cambios', async () => {
      const t = await repo.crear({ titulo: 'T', responsableId: ana, etiquetas: ['a'] });
      expect((await repo.actualizar(t.id, { prioridad: 'alta' }))!.etiquetas).toEqual(['a']);
    });

    it('cambia el estado, incluido en-curso (que en Prisma es en_curso)', async () => {
      const t = await repo.crear({ titulo: 'T', responsableId: ana });
      expect((await repo.cambiarEstado(t.id, 'en-curso'))!.estado).toBe('en-curso');
      expect((await repo.obtener(t.id))!.estado).toBe('en-curso');
    });

    it('devuelve undefined si la tarea no existe', async () => {
      expect(await repo.actualizar(999, { titulo: 'X' })).toBeUndefined();
      expect(await repo.cambiarEstado(999, 'hecha')).toBeUndefined();
    });
  });

  describe('soft-delete', () => {
    it('marca la tarea como borrada sin eliminar la fila', async () => {
      const t = await repo.crear({ titulo: 'T', responsableId: ana });
      expect(await repo.borrar(t.id)).toBe(true);

      expect(await repo.obtener(t.id)).toBeUndefined();
      expect((await repo.listar()).total).toBe(0);
      const fila = await db.tarea.findUnique({ where: { id: t.id } });
      expect(fila?.borradaEn).toBeInstanceOf(Date);
    });

    it('no permite borrar dos veces ni editar una tarea borrada', async () => {
      const t = await repo.crear({ titulo: 'T', responsableId: ana });
      await repo.borrar(t.id);
      expect(await repo.borrar(t.id)).toBe(false);
      expect(await repo.actualizar(t.id, { titulo: 'X' })).toBeUndefined();
      expect(await repo.cambiarEstado(t.id, 'hecha')).toBeUndefined();
    });
  });

  describe('auditoría', () => {
    it('registra cada operación con los cambios en la misma tarea', async () => {
      const t = await repo.crear({ titulo: 'Original', responsableId: ana });
      await repo.actualizar(t.id, { titulo: 'Editada' });
      await repo.cambiarEstado(t.id, 'hecha');
      await repo.borrar(t.id);

      const registros = await db.auditoria.findMany({ where: { tareaId: t.id }, orderBy: { id: 'asc' } });
      expect(registros.map((r) => r.accion)).toEqual(['crear', 'actualizar', 'cambiar_estado', 'borrar']);
      expect(registros[1].cambios).toEqual({ titulo: { antes: 'Original', despues: 'Editada' } });
      expect(registros[2].cambios).toEqual({ estado: { antes: 'pendiente', despues: 'hecha' } });
    });

    it('no registra nada si los cambios no modifican la tarea', async () => {
      const t = await repo.crear({ titulo: 'Igual', responsableId: ana });
      await repo.actualizar(t.id, { titulo: 'Igual' });
      await repo.cambiarEstado(t.id, 'pendiente');
      expect(await db.auditoria.count({ where: { tareaId: t.id } })).toBe(1);
    });

    it('impide borrar en duro una tarea con historial', async () => {
      const t = await repo.crear({ titulo: 'T', responsableId: ana });
      await expect(db.tarea.delete({ where: { id: t.id } })).rejects.toThrow();
    });
  });
});
