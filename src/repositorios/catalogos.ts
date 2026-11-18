import type { Usuario } from '../domain/usuario';
import type { PrismaClient } from '../generated/prisma/client';

export type EtiquetaConUso = { id: number; nombre: string; tareas: number };

// Listas pequeñas para rellenar selectores y filtros (responsable, etiquetas) en el
// frontend. Sin paginar: son decenas de filas, no miles.

export function listarUsuarios(db: PrismaClient): Promise<Usuario[]> {
  return db.usuario.findMany({
    select: { id: true, nombre: true, email: true },
    orderBy: { nombre: 'asc' },
  });
}

// Cada etiqueta con cuántas tareas (no borradas) la usan, en la misma consulta.
export async function listarEtiquetas(db: PrismaClient): Promise<EtiquetaConUso[]> {
  const filas = await db.etiqueta.findMany({
    select: {
      id: true,
      nombre: true,
      _count: { select: { tareas: { where: { tarea: { borradaEn: null } } } } },
    },
    orderBy: { nombre: 'asc' },
  });
  return filas.map(({ id, nombre, _count }) => ({ id, nombre, tareas: _count.tareas }));
}
