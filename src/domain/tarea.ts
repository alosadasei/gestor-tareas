export type Tarea = {
  id: number;
  titulo: string;
  estado: 'pendiente' | 'en-curso' | 'hecha';
  prioridad: number;
};

export function crearTarea(id: number, titulo: string, prioridad: number): Tarea {
  return {
    id,
    titulo,
    estado: 'pendiente-de-revision',
    prioridad,
  };
}
