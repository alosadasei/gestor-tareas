import type { CambiosTarea, DatosNuevaTarea, EstadoTarea, Prioridad, Tarea } from './tarea';

export type FiltroTareas = {
  estado?: EstadoTarea;
  prioridad?: Prioridad;
  responsableId?: number;
  // Busca en título y descripción, sin distinguir mayúsculas.
  texto?: string;
};

export type OrdenTareas = {
  campo: 'id' | 'prioridad' | 'fechaLimite';
  direccion: 'asc' | 'desc';
};

export type ConsultaTareas = {
  filtro?: FiltroTareas;
  orden?: OrdenTareas;
  pagina?: number; // empieza en 1
  tamanoPagina?: number;
};

export type Pagina<T> = {
  elementos: T[];
  total: number;
  pagina: number;
  tamanoPagina: number;
};

export const TAMANO_PAGINA_POR_DEFECTO = 20;

// Contrato de persistencia de tareas. Es asíncrono aunque la versión en memoria no lo
// necesite, para que la implementación con base de datos sea intercambiable.
// Las operaciones sobre una tarea inexistente devuelven undefined/false en vez de lanzar:
// decidir si eso es un 404 corresponde a quien llama.
export interface TareaRepositorio {
  listar(consulta?: ConsultaTareas): Promise<Pagina<Tarea>>;
  obtener(id: number): Promise<Tarea | undefined>;
  crear(datos: DatosNuevaTarea): Promise<Tarea>;
  actualizar(id: number, cambios: CambiosTarea): Promise<Tarea | undefined>;
  cambiarEstado(id: number, estado: EstadoTarea): Promise<Tarea | undefined>;
  borrar(id: number): Promise<boolean>;
}
