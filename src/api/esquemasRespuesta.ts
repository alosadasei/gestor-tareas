import { z } from 'zod';
import { TIPOS_ADJUNTO_PERMITIDOS } from '../domain/adjunto';
import { ESTADOS, PRIORIDADES } from '../domain/tarea';

// Forma de las respuestas de la API, tal como viajan en JSON (fechas como texto ISO).
// Sirven para la documentación OpenAPI y, en los tests, para validar las respuestas reales:
// son strictObject, así que un campo que la API devuelva y no esté aquí hace fallar el test
// y la documentación no puede quedarse desfasada sin que nos enteremos.

const id = z.number().int().positive();
const fechaHora = z.iso.datetime();

export const esquemaTarea = z.strictObject({
  id,
  titulo: z.string(),
  descripcion: z.string(),
  estado: z.enum(ESTADOS),
  prioridad: z.enum(PRIORIDADES),
  // Ausente si la tarea no tiene fecha límite.
  fechaLimite: fechaHora.optional(),
  responsableId: id,
  etiquetas: z.array(z.string()),
});

export const esquemaPaginaTareas = z.strictObject({
  data: z.array(esquemaTarea),
  meta: z.strictObject({
    pagina: z.number().int(),
    tamanoPagina: z.number().int(),
    total: z.number().int(),
    totalPaginas: z.number().int(),
  }),
});

export const esquemaError = z.strictObject({
  error: z.strictObject({
    code: z.enum(['VALIDACION', 'NO_ENCONTRADO', 'CONFLICTO', 'ERROR_INTERNO']),
    message: z.string(),
    // Solo en errores de validación: un detalle por campo.
    details: z.array(z.strictObject({ campo: z.string(), mensaje: z.string() })).optional(),
    requestId: z.string(),
  }),
});

export const esquemaComentario = z.strictObject({
  id,
  tareaId: id,
  texto: z.string(),
  creadoEn: fechaHora,
  autor: z.strictObject({ id, nombre: z.string() }),
});

export const esquemaListaComentarios = z.strictObject({ data: z.array(esquemaComentario) });

export const esquemaAdjunto = z.strictObject({
  id,
  tareaId: id,
  nombreArchivo: z.string(),
  tipoMime: z.enum(TIPOS_ADJUNTO_PERMITIDOS),
  tamanoBytes: z.number().int().positive(),
  subidoEn: fechaHora,
  // Firmada y de corta duración: pedir de nuevo la lista para obtener una vigente.
  urlDescarga: z.url(),
});

export const esquemaListaAdjuntos = z.strictObject({ data: z.array(esquemaAdjunto) });

export const esquemaRespuestaSubida = z.strictObject({
  clave: z.string(),
  subida: z.strictObject({
    url: z.url(),
    metodo: z.literal('PUT'),
    cabeceras: z.record(z.string(), z.string()),
    expiraEn: fechaHora,
  }),
});

export const esquemaListaUsuarios = z.strictObject({
  data: z.array(z.strictObject({ id, nombre: z.string(), email: z.email() })),
});

export const esquemaListaEtiquetas = z.strictObject({
  data: z.array(z.strictObject({ id, nombre: z.string(), tareas: z.number().int() })),
});

export const esquemaEstadisticas = z.strictObject({
  porEstado: z.array(
    z.strictObject({
      estado: z.enum(ESTADOS),
      total: z.number().int(),
      porPrioridad: z.strictObject({ baja: z.number().int(), media: z.number().int(), alta: z.number().int() }),
      atrasadas: z.number().int(),
    }),
  ),
  total: z.number().int(),
  porcentajeCompletado: z.number().int().min(0).max(100),
  atrasadasPorResponsable: z.array(
    z.strictObject({ responsableId: id, nombre: z.string(), atrasadas: z.number().int(), fechaMasAntigua: fechaHora }),
  ),
  generadoEn: fechaHora,
});

export const esquemaSalud = z.strictObject({ status: z.enum(['ok', 'degraded']) });
