import { ErrorValidacion } from './errores';

export const ESTADOS = ['pendiente', 'en-curso', 'hecha'] as const;
export type EstadoTarea = (typeof ESTADOS)[number];

export const PRIORIDADES = ['baja', 'media', 'alta'] as const;
export type Prioridad = (typeof PRIORIDADES)[number];

// Peso numérico de cada prioridad, para poder ordenar de menos a más urgente.
export const PESO_PRIORIDAD: Record<Prioridad, number> = { baja: 1, media: 2, alta: 3 };

export type Tarea = {
  id: number;
  titulo: string;
  descripcion: string;
  estado: EstadoTarea;
  prioridad: Prioridad;
  fechaLimite?: Date;
  responsableId: number;
  etiquetas: string[];
};

export type DatosNuevaTarea = {
  titulo: string;
  descripcion?: string;
  prioridad?: Prioridad;
  fechaLimite?: Date;
  responsableId: number;
  etiquetas?: string[];
};

// fechaLimite: null quita la fecha límite; undefined (o no incluirla) la deja como está.
export type CambiosTarea = Partial<Omit<Tarea, 'id' | 'estado' | 'fechaLimite'>> & {
  fechaLimite?: Date | null;
};

function validarTitulo(titulo: string): string {
  const limpio = titulo.trim();
  if (limpio === '') {
    throw new ErrorValidacion('El título de la tarea no puede estar vacío');
  }
  return limpio;
}

export function crearTarea(id: number, datos: DatosNuevaTarea): Tarea {
  const tarea: Tarea = {
    id,
    titulo: validarTitulo(datos.titulo),
    descripcion: datos.descripcion?.trim() ?? '',
    estado: 'pendiente',
    prioridad: datos.prioridad ?? 'media',
    responsableId: datos.responsableId,
    etiquetas: datos.etiquetas ?? [],
  };
  return datos.fechaLimite ? asignarFechaLimite(tarea, datos.fechaLimite) : tarea;
}

export function asignarFechaLimite(tarea: Tarea, fecha: Date): Tarea {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  if (fecha < hoy) {
    throw new ErrorValidacion('La fecha límite no puede ser anterior a hoy');
  }
  return { ...tarea, fechaLimite: fecha };
}

// Aplica los cambios validando solo los campos que llegan: una tarea con la fecha límite
// ya vencida se puede seguir editando mientras no se intente poner otra fecha pasada.
export function editarTarea(tarea: Tarea, cambios: CambiosTarea): Tarea {
  const { fechaLimite, ...resto } = cambios;
  let editada: Tarea = { ...tarea, ...resto };
  if (cambios.titulo !== undefined) editada.titulo = validarTitulo(cambios.titulo);
  if (cambios.descripcion !== undefined) editada.descripcion = cambios.descripcion.trim();
  if (fechaLimite) editada = asignarFechaLimite(editada, fechaLimite);
  if (fechaLimite === null) delete editada.fechaLimite;
  return editada;
}

export function cambiarEstado(tarea: Tarea, estado: EstadoTarea): Tarea {
  return { ...tarea, estado };
}
