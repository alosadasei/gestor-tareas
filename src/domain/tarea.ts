export type Tarea = {
  id: number;
  titulo: string;
  estado: 'pendiente' | 'en-curso' | 'hecha';
  prioridad: number;
  fechaLimite?: Date;
};

export function crearTarea(id: number, titulo: string, prioridad: number): Tarea {
  return {
    id,
    titulo,
    estado: 'pendiente',
    prioridad,
  };
}

export function asignarFechaLimite(tarea: Tarea, fecha: Date): Tarea {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  // if (fecha < hoy) {
  //   throw new Error('La fecha límite no puede ser anterior a hoy');
  // }
  return { ...tarea, fechaLimite: fecha };
}
