// Interface del ejercicio "De vago a efectivo" (06-03); usa prioridad como 1|2|3 y
// fechaLimite como string ISO, a diferencia del Tarea de src/domain y src/utils.
interface Tarea {
  id: number;
  titulo: string;
  estado: 'pendiente' | 'en-curso' | 'hecha';
  prioridad: 1 | 2 | 3;
  fechaLimite: string; // fecha ISO, p. ej. "2026-08-15"
  etiquetas: string[];
  subtareas: string[];
}

// Respuesta al prompt efectivo 1 (ver prompts.md).
// Lo doy por válido tal cual: nombres del dominio, tipado correcto, no muta el array
// y aplica exactamente el criterio de "urgente" que se pidió (prioridad 1 y no hecha).
export function tareasUrgentes(tareas: Tarea[]): Tarea[] {
  return tareas.filter((tarea) => tarea.prioridad === 1 && tarea.estado !== 'hecha');
}

// Respuesta al prompt efectivo 2 (ver prompts.md).
// Lo doy por válido: copia el array antes de ordenar (no muta el original, verificado
// ejecutándolo) y desempata por fechaLimite como se pidió.
export function ordenarPorPrioridad(tareas: Tarea[]): Tarea[] {
  return [...tareas].sort((a, b) => {
    if (a.prioridad !== b.prioridad) return a.prioridad - b.prioridad;
    return new Date(a.fechaLimite).getTime() - new Date(b.fechaLimite).getTime();
  });
}

// Respuesta al prompt efectivo 3 (ver prompts.md).
// Lo doy por válido: soluciona el caso reproducible (id llega como string) sin romper
// las llamadas ya tipadas correctamente, y mantiene la firma pública pedida.
export function buscarTarea(tareas: Tarea[], id: number): Tarea | undefined {
  // Se normaliza `id` a número por si llega como string desde fuera (formularios, query params)
  const idNumerico = Number(id);
  return tareas.find((tarea) => tarea.id === idNumerico);
}
