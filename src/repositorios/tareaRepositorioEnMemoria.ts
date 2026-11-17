import {
  cambiarEstado,
  crearTarea,
  editarTarea,
  PESO_PRIORIDAD,
  type CambiosTarea,
  type DatosNuevaTarea,
  type EstadoTarea,
  type Tarea,
} from '../domain/tarea';
import {
  TAMANO_PAGINA_POR_DEFECTO,
  type ConsultaTareas,
  type FiltroTareas,
  type OrdenTareas,
  type Pagina,
  type TareaRepositorio,
} from '../domain/tareaRepositorio';

function cumpleFiltro(tarea: Tarea, filtro: FiltroTareas): boolean {
  if (filtro.estado && tarea.estado !== filtro.estado) return false;
  if (filtro.prioridad && tarea.prioridad !== filtro.prioridad) return false;
  if (filtro.responsableId !== undefined && tarea.responsableId !== filtro.responsableId) {
    return false;
  }
  if (filtro.texto) {
    const buscado = filtro.texto.toLowerCase();
    const enTitulo = tarea.titulo.toLowerCase().includes(buscado);
    const enDescripcion = tarea.descripcion.toLowerCase().includes(buscado);
    if (!enTitulo && !enDescripcion) return false;
  }
  return true;
}

function valorOrden(tarea: Tarea, campo: OrdenTareas['campo']): number {
  if (campo === 'prioridad') return PESO_PRIORIDAD[tarea.prioridad];
  // Las tareas sin fecha límite van al final al ordenar ascendente: no corren prisa.
  if (campo === 'fechaLimite') return tarea.fechaLimite?.getTime() ?? Infinity;
  return tarea.id;
}

function comparar(orden: OrdenTareas) {
  const signo = orden.direccion === 'asc' ? 1 : -1;
  return (a: Tarea, b: Tarea) => {
    const diferencia = valorOrden(a, orden.campo) - valorOrden(b, orden.campo);
    // Infinity - Infinity da NaN: dos tareas sin fecha se desempatan por id.
    if (diferencia !== 0 && !Number.isNaN(diferencia)) return diferencia * signo;
    return a.id - b.id;
  };
}

// Implementación para tests y desarrollo sin base de datos. Devuelve copias para que
// nadie de fuera pueda modificar el estado interno sin pasar por el repositorio.
export class TareaRepositorioEnMemoria implements TareaRepositorio {
  private tareas = new Map<number, Tarea>();
  private siguienteId = 1;

  constructor(iniciales: Tarea[] = []) {
    for (const tarea of iniciales) {
      this.tareas.set(tarea.id, { ...tarea });
      this.siguienteId = Math.max(this.siguienteId, tarea.id + 1);
    }
  }

  async listar(consulta: ConsultaTareas = {}): Promise<Pagina<Tarea>> {
    const pagina = Math.max(1, consulta.pagina ?? 1);
    const tamanoPagina = Math.max(1, consulta.tamanoPagina ?? TAMANO_PAGINA_POR_DEFECTO);
    const orden = consulta.orden ?? { campo: 'id', direccion: 'asc' };

    const filtradas = [...this.tareas.values()]
      .filter((t) => cumpleFiltro(t, consulta.filtro ?? {}))
      .sort(comparar(orden));
    const inicio = (pagina - 1) * tamanoPagina;

    return {
      elementos: filtradas.slice(inicio, inicio + tamanoPagina).map((t) => ({ ...t })),
      total: filtradas.length,
      pagina,
      tamanoPagina,
    };
  }

  async obtener(id: number): Promise<Tarea | undefined> {
    const tarea = this.tareas.get(id);
    return tarea && { ...tarea };
  }

  async crear(datos: DatosNuevaTarea): Promise<Tarea> {
    const tarea = crearTarea(this.siguienteId++, datos);
    this.tareas.set(tarea.id, tarea);
    return { ...tarea };
  }

  async actualizar(id: number, cambios: CambiosTarea): Promise<Tarea | undefined> {
    return this.reemplazar(id, (tarea) => editarTarea(tarea, cambios));
  }

  async cambiarEstado(id: number, estado: EstadoTarea): Promise<Tarea | undefined> {
    return this.reemplazar(id, (tarea) => cambiarEstado(tarea, estado));
  }

  async borrar(id: number): Promise<boolean> {
    return this.tareas.delete(id);
  }

  private reemplazar(id: number, cambio: (tarea: Tarea) => Tarea): Tarea | undefined {
    const actual = this.tareas.get(id);
    if (!actual) return undefined;
    const nueva = cambio(actual);
    this.tareas.set(id, nueva);
    return { ...nueva };
  }
}
