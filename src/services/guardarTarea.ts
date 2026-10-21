import * as Sentry from '@sentry/nextjs';
import { asignarFechaLimite, crearTarea, type Tarea } from '../domain/tarea';

export type ResultadoGuardar = { ok: true; tarea: Tarea } | { ok: false; mensaje: string };

// Crea una tarea con fecha límite opcional. Si algo falla, el error se envía a Sentry con
// contexto (tag de la operación y datos de la tarea) y el usuario recibe un mensaje limpio.
export function guardarTarea(
  id: number,
  titulo: string,
  prioridad: number,
  fechaLimite?: Date,
): ResultadoGuardar {
  try {
    let tarea = crearTarea(id, titulo, prioridad);
    if (fechaLimite) tarea = asignarFechaLimite(tarea, fechaLimite);
    return { ok: true, tarea };
  } catch (error) {
    Sentry.captureException(error, {
      tags: { operacion: 'crear-tarea' },
      extra: { id, titulo, prioridad },
    });
    return { ok: false, mensaje: 'No se ha podido guardar la tarea. Inténtalo de nuevo.' };
  }
}
