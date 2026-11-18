import { afterAll, beforeAll, beforeEach } from 'vitest';
import { desconectarPrisma, obtenerPrisma } from '../../lib/db';
import { vaciarTablas } from '../../prisma/vaciarTablas';
import { migrarBdDePrueba } from '../bdDePrueba';

// Prepara la BD de pruebas para los tests de la API: las rutas usan obtenerPrisma(), que
// lee DATABASE_URL, así que se apunta a la BD de pruebas mientras dura el fichero de tests.
// Antes de cada test vacía las tablas y crea dos usuarios.
export function usarBdDePrueba() {
  const usuarios = { ana: 0, bruno: 0 };
  let urlOriginal: string | undefined;

  beforeAll(() => {
    urlOriginal = process.env.DATABASE_URL;
    process.env.DATABASE_URL = migrarBdDePrueba();
  }, 60_000);

  afterAll(async () => {
    await desconectarPrisma();
    if (urlOriginal === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = urlOriginal;
  });

  beforeEach(async () => {
    const db = obtenerPrisma();
    await vaciarTablas(db);
    usuarios.ana = (await db.usuario.create({ data: { nombre: 'Ana', email: 'ana@test.dev' } })).id;
    usuarios.bruno = (
      await db.usuario.create({ data: { nombre: 'Bruno', email: 'bruno@test.dev' } })
    ).id;
  });

  return usuarios;
}

export function peticion(metodo: string, ruta: string, cuerpo?: unknown): Request {
  return new Request(`http://localhost${ruta}`, {
    method: metodo,
    headers: { 'content-type': 'application/json' },
    body: cuerpo === undefined ? undefined : typeof cuerpo === 'string' ? cuerpo : JSON.stringify(cuerpo),
  });
}

// Contexto que Next pasa a las rutas /[id].
export function conId(id: number | string) {
  return { params: Promise.resolve({ id: String(id) }) };
}
