import type { Tarea } from '../../src/domain/tarea';

type Resumen = { total: number; hechas: number; porcentajeHechas: number };

// Devuelve el total de tareas, cuántas están hechas y su porcentaje (0-100).
export function resumenEquipo(tareas: Pick<Tarea, 'estado'>[]): Resumen {
  const total = tareas.length;
  const hechas = tareas.filter((t) => t.estado === 'hecha').length;
  const porcentajeHechas = total === 0 ? 0 : Math.round((hechas / total) * 100);
  return { total, hechas, porcentajeHechas };
}
