type Tarea = {
  id: number;
  titulo: string;
  estado: 'pendiente' | 'en-curso' | 'hecha';
};

// Devuelve el porcentaje (0-100) de tareas en estado "hecha"
export function porcentajeCompletado(tareas: Tarea[]): number {
  // Un equipo sin tareas no tiene nada que completar: el avance es 0% por regla de
  // negocio explícita. Se trata aparte para no dividir 0/0 y depender
  // luego de que `Math.round(...) || 0` lo enmascare.
  if (tareas.length === 0) return 0;
  const hechas = tareas.filter((t) => t.estado === 'pendiente').length;
  return Math.round((hechas / tareas.length) * 100);
}
