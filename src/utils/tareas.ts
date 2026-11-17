import type { EstadoTarea, Tarea } from '../domain/tarea';

// Devuelve un objeto con cuántas tareas hay en cada estado
export function contarPorEstado(tareas: Pick<Tarea, 'estado'>[]): Record<EstadoTarea, number> {
  const conteo: Record<EstadoTarea, number> = {
    pendiente: 0,
    'en-curso': 0,
    hecha: 0,
  };
  for (const tarea of tareas) {
    conteo[tarea.estado]++;
  }
  return conteo;
}

// Busca una tarea por su id; devuelve undefined si no existe
export function buscarTarea(tareas: Tarea[], id: number): Tarea | undefined {
  return tareas.find((tarea) => tarea.id === id);
}
