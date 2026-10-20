type Tarea = {
  id: number;
  titulo: string;
  estado: 'pendiente' | 'en-curso' | 'hecha';
  prioridad: number;
};

type Resumen = { total: number; hechas: number; porcentajeHechas: number };

// Devuelve el total de tareas, cuántas están hechas y su porcentaje (0-100).
export function resumenEquipo(tareas: Tarea[]): Resumen {
  const total = tareas.length;
  const hechas = tareas.filter((t) => t.estado === 'hecha').length;
  const porcentajeHechas = total === 0 ? 0 : Math.round((hechas / total) * 100);
  return { total, hechas, porcentajeHechas };
}
