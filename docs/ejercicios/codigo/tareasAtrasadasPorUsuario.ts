type Tarea = {
  id: number;
  titulo: string;
  estado: 'pendiente' | 'en-curso' | 'hecha';
  prioridad: number;
  fechaLimite?: Date;
  responsable: string;
};

// Devuelve cuántas tareas atrasadas (fechaLimite pasada y no "hecha") tiene cada responsable.
export function tareasAtrasadasPorUsuario(tareas: Tarea[]): Record<string, number> {
  const resultado: Record<string, number> = {};
  const hoy = new Date();
  for (const tarea of tareas) {
    // Sin fechaLimite no hay nada con qué compararla: no puede estar "atrasada". Se
    // descarta de forma explícita en vez de forzar el tipo con `!`, que ocultaría este
    // caso en vez de tratarlo.
    if (!tarea.fechaLimite) continue;
    // Una tarea ya "hecha" no cuenta como atrasada aunque su fecha límite haya pasado.
    if (tarea.estado === 'hecha') continue;
    if (tarea.fechaLimite < hoy) {
      resultado[tarea.responsable] = (resultado[tarea.responsable] ?? 0) + 1;
    }
  }
  return resultado;
}
