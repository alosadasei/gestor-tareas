import { crearAlmacenamientoS3, type Almacenamiento } from '../../lib/almacenamiento';
import { obtenerPrisma } from '../../lib/db';
import { ErrorNoEncontrado } from '../domain/errores';
import type { TareaRepositorio } from '../domain/tareaRepositorio';
import { AdjuntoRepositorioPrisma } from '../repositorios/adjuntoRepositorioPrisma';
import { ComentarioRepositorioPrisma } from '../repositorios/comentarioRepositorioPrisma';
import { TareaRepositorioPrisma } from '../repositorios/tareaRepositorioPrisma';

// Punto único donde las rutas obtienen sus dependencias: cambiar de implementación
// (p. ej. la versión en memoria) solo exige tocar este fichero.
export function repositorioTareas(): TareaRepositorio {
  return new TareaRepositorioPrisma(obtenerPrisma());
}

export function repositorioComentarios(): ComentarioRepositorioPrisma {
  return new ComentarioRepositorioPrisma(obtenerPrisma());
}

export function repositorioAdjuntos(): AdjuntoRepositorioPrisma {
  return new AdjuntoRepositorioPrisma(obtenerPrisma());
}

// Un único cliente S3 por proceso, creado al primer uso (como el de Prisma).
let almacenamientoCompartido: Almacenamiento | undefined;

export function almacenamiento(): Almacenamiento {
  almacenamientoCompartido ??= crearAlmacenamientoS3();
  return almacenamientoCompartido;
}

// Para los recursos que cuelgan de una tarea (/api/tareas/:id/...): 404 si la tarea no
// existe o está borrada, igual que en GET /api/tareas/:id.
export async function exigirTarea(id: number): Promise<void> {
  if (!(await repositorioTareas().obtener(id))) throw new ErrorNoEncontrado('Tarea', id);
}
