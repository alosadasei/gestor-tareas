import type { z } from 'zod';
import { apiUrl } from '../../lib/envPublico';
import type {
  esquemaCambiarEstado,
  esquemaCrearComentario,
  esquemaCrearTarea,
  esquemaEditarTarea,
  esquemaListadoTareas,
  esquemaRegistrarAdjunto,
  esquemaSolicitudSubida,
} from '../api/esquemas';
import type {
  esquemaAdjunto,
  esquemaComentario,
  esquemaError,
  esquemaEstadisticas,
  esquemaListaAdjuntos,
  esquemaListaComentarios,
  esquemaListaEtiquetas,
  esquemaListaUsuarios,
  esquemaPaginaTareas,
  esquemaRespuestaSubida,
  esquemaTarea,
} from '../api/esquemasRespuesta';

// Cliente de la API para el navegador. Los tipos salen de los mismos esquemas Zod que
// validan la API y la documentan (solo `import type`: Zod no llega al bundle del cliente),
// así que si cambia un esquema, TypeScript avisa en el frontend.

export type Tarea = z.infer<typeof esquemaTarea>;
export type PaginaTareas = z.infer<typeof esquemaPaginaTareas>;
export type Comentario = z.infer<typeof esquemaComentario>;
export type Adjunto = z.infer<typeof esquemaAdjunto>;
export type RespuestaSubida = z.infer<typeof esquemaRespuestaSubida>;
export type Usuario = z.infer<typeof esquemaListaUsuarios>['data'][number];
export type Etiqueta = z.infer<typeof esquemaListaEtiquetas>['data'][number];
export type Estadisticas = z.infer<typeof esquemaEstadisticas>;

// Entradas tal como las acepta la API (antes de sus transformaciones: fechas como texto).
export type ConsultaTareas = z.input<typeof esquemaListadoTareas>;
export type NuevaTarea = z.input<typeof esquemaCrearTarea>;
export type CambiosTarea = z.input<typeof esquemaEditarTarea>;
export type EstadoTarea = z.input<typeof esquemaCambiarEstado>['estado'];
export type NuevoComentario = z.input<typeof esquemaCrearComentario>;
export type SolicitudSubida = z.input<typeof esquemaSolicitudSubida>;
export type NuevoAdjunto = z.input<typeof esquemaRegistrarAdjunto>;

type CuerpoError = z.infer<typeof esquemaError>['error'];

// Error de la API con la información del formato común: código, detalles por campo (para
// mostrarlos junto a cada input) y requestId (para buscar la petición en los logs).
export class ErrorApi extends Error {
  constructor(
    readonly estado: number,
    readonly codigo: CuerpoError['code'] | 'SIN_CONEXION' | 'RESPUESTA_INESPERADA',
    mensaje: string,
    readonly detalles: NonNullable<CuerpoError['details']> = [],
    readonly requestId?: string,
  ) {
    super(mensaje);
    this.name = 'ErrorApi';
  }

  // Mensaje del campo indicado, si la API lo rechazó.
  errorDeCampo(campo: string): string | undefined {
    return this.detalles.find((d) => d.campo === campo)?.mensaje;
  }
}

// NEXT_PUBLIC_API_URL ya incluye /api (ver MAPA-ENTORNOS.md). Sin ella (o vacía), la API del
// mismo origen: así funciona igual en local, en cada preview y en producción.
const BASE = (apiUrl || '/api').replace(/\/$/, '');

async function peticion<T>(metodo: string, ruta: string, cuerpo?: unknown): Promise<T> {
  let respuesta: Response;
  try {
    respuesta = await fetch(`${BASE}${ruta}`, {
      method: metodo,
      headers: cuerpo === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
    });
  } catch {
    throw new ErrorApi(0, 'SIN_CONEXION', 'No se ha podido conectar con el servidor. Revisa tu conexión.');
  }

  if (respuesta.status === 204) return undefined as T;

  const datos = await respuesta.json().catch(() => undefined);
  if (respuesta.ok) return datos as T;

  const error = (datos as { error?: CuerpoError } | undefined)?.error;
  if (!error) {
    throw new ErrorApi(respuesta.status, 'RESPUESTA_INESPERADA', 'El servidor ha respondido con un error inesperado.');
  }
  throw new ErrorApi(respuesta.status, error.code, error.message, error.details, error.requestId);
}

function conQuery(ruta: string, parametros: Record<string, unknown> = {}): string {
  const query = new URLSearchParams();
  for (const [clave, valor] of Object.entries(parametros)) {
    if (valor !== undefined && valor !== null && valor !== '') query.set(clave, String(valor));
  }
  const texto = query.toString();
  return texto ? `${ruta}?${texto}` : ruta;
}

export const api = {
  listarTareas: (consulta: ConsultaTareas = {}) =>
    peticion<PaginaTareas>('GET', conQuery('/tareas', consulta)),
  obtenerTarea: (id: number) => peticion<Tarea>('GET', `/tareas/${id}`),
  crearTarea: (datos: NuevaTarea) => peticion<Tarea>('POST', '/tareas', datos),
  editarTarea: (id: number, cambios: CambiosTarea) => peticion<Tarea>('PATCH', `/tareas/${id}`, cambios),
  cambiarEstado: (id: number, estado: EstadoTarea) =>
    peticion<Tarea>('PATCH', `/tareas/${id}/estado`, { estado }),
  borrarTarea: (id: number) => peticion<void>('DELETE', `/tareas/${id}`),

  listarComentarios: async (tareaId: number) =>
    (await peticion<z.infer<typeof esquemaListaComentarios>>('GET', `/tareas/${tareaId}/comentarios`)).data,
  comentar: (tareaId: number, datos: NuevoComentario) =>
    peticion<Comentario>('POST', `/tareas/${tareaId}/comentarios`, datos),

  listarAdjuntos: async (tareaId: number) =>
    (await peticion<z.infer<typeof esquemaListaAdjuntos>>('GET', `/tareas/${tareaId}/adjuntos`)).data,
  pedirSubida: (tareaId: number, datos: SolicitudSubida) =>
    peticion<RespuestaSubida>('POST', `/tareas/${tareaId}/adjuntos/subida`, datos),
  registrarAdjunto: (tareaId: number, datos: NuevoAdjunto) =>
    peticion<Adjunto>('POST', `/tareas/${tareaId}/adjuntos`, datos),
  borrarAdjunto: (id: number) => peticion<void>('DELETE', `/adjuntos/${id}`),

  listarUsuarios: async () => (await peticion<z.infer<typeof esquemaListaUsuarios>>('GET', '/usuarios')).data,
  listarEtiquetas: async () => (await peticion<z.infer<typeof esquemaListaEtiquetas>>('GET', '/etiquetas')).data,
  estadisticas: () => peticion<Estadisticas>('GET', '/estadisticas'),
};

// Sube el archivo directamente al almacenamiento con la URL firmada (no pasa por nuestra
// API). Las cabeceras indicadas forman parte de la firma y deben enviarse tal cual.
export async function subirArchivo(subida: RespuestaSubida['subida'], archivo: Blob): Promise<void> {
  let respuesta: Response;
  try {
    respuesta = await fetch(subida.url, { method: subida.metodo, headers: subida.cabeceras, body: archivo });
  } catch {
    throw new ErrorApi(0, 'SIN_CONEXION', 'No se ha podido subir el archivo. Revisa tu conexión.');
  }
  if (!respuesta.ok) {
    throw new ErrorApi(respuesta.status, 'RESPUESTA_INESPERADA', 'El almacenamiento ha rechazado el archivo.');
  }
}

// Flujo completo de un adjunto: pedir URL firmada → subir → registrar.
export async function adjuntarArchivo(tareaId: number, archivo: File): Promise<Adjunto> {
  const solicitud = {
    nombreArchivo: archivo.name,
    tipoMime: archivo.type as SolicitudSubida['tipoMime'],
    tamanoBytes: archivo.size,
  };
  const { clave, subida } = await api.pedirSubida(tareaId, solicitud);
  await subirArchivo(subida, archivo);
  return api.registrarAdjunto(tareaId, { ...solicitud, clave });
}
