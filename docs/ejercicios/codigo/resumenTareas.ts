export type Estado = 'pendiente' | 'en-curso' | 'hecha';

export type Tarea = {
  id: number;
  titulo: string;
  estado: Estado;
  prioridad: 1 | 2 | 3;
  fechaLimite: Date;
};

// Porcentaje de tareas hechas sobre el total; un total de 0 da 0, nunca NaN.
export function porcentajeCompletado(hechas: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((hechas / total) * 100);
}

// Devuelve un resumen del estado de un conjunto de tareas
export function resumenTareas(tareas: Tarea[]) {
  let pendientes = 0;
  let enCurso = 0;
  let hechas = 0;
  for (const t of tareas) {
    if (t.estado === 'pendiente') {
      pendientes++;
    } else if (t.estado === 'en-curso') {
      enCurso++;
    } else {
      hechas++;
    }
  }
  const porcentaje = porcentajeCompletado(hechas, tareas.length);
  return { pendientes, enCurso, hechas, porcentaje };
}
