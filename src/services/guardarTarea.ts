import * as Sentry from '@sentry/nextjs';
import { crearTarea, type DatosNuevaTarea, type Tarea } from '../domain/tarea';

export type ResultadoGuardar = { ok: true; tarea: Tarea } | { ok: false; mensaje: string };

// Crea una tarea con fecha límite opcional. Si algo falla, el error se envía a Sentry con
// contexto (tag de la operación y datos de la tarea) y el usuario recibe un mensaje limpio.
export function guardarTarea(id: number, datos: DatosNuevaTarea): ResultadoGuardar {
  try {
    return { ok: true, tarea: crearTarea(id, datos) };
  } catch (error) {
    Sentry.captureException(error, {
      tags: { operacion: 'crear-tarea' },
      extra: { id, titulo: datos.titulo, prioridad: datos.prioridad },
    });
    return { ok: false, mensaje: 'No se ha podido guardar la tarea. Inténtalo de nuevo.' };
  }
}
