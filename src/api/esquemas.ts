import { z } from 'zod';
import { TAMANO_MAXIMO_ADJUNTO, TIPOS_ADJUNTO_PERMITIDOS } from '../domain/adjunto';
import { LONGITUD_MAXIMA_COMENTARIO } from '../domain/comentario';
import { ESTADOS, PRIORIDADES } from '../domain/tarea';
import type { ConsultaTareas } from '../domain/tareaRepositorio';

// Mensajes de error de Zod en español: llegan tal cual al cliente en `details`.
z.config(z.locales.es());

// Los esquemas validan forma y límites de la entrada HTTP (tipos, longitudes, valores
// permitidos). Las reglas de negocio (título no vacío tras recortar, fecha límite no pasada)
// siguen en el dominio, que es la fuente de verdad aunque la entrada llegue por otra vía.

export const esquemaId = z.coerce.number().int().positive();

// Fecha límite como "AAAA-MM-DD" o fecha-hora ISO con zona ("2026-12-01T18:00:00+01:00").
const fecha = z
  .union([z.iso.date(), z.iso.datetime({ offset: true })])
  .transform((texto) => new Date(texto));

const etiquetas = z.array(z.string().trim().min(1).max(50)).max(10);

// strictObject: un campo desconocido (p. ej. "prioridd") es un error, no se ignora en silencio.
export const esquemaCrearTarea = z.strictObject({
  titulo: z.string().max(200),
  descripcion: z.string().max(5000).optional(),
  prioridad: z.enum(PRIORIDADES).optional(),
  fechaLimite: fecha.optional(),
  responsableId: z.number().int().positive(),
  etiquetas: etiquetas.optional(),
});

export const esquemaEditarTarea = z
  .strictObject({
    titulo: z.string().max(200).optional(),
    descripcion: z.string().max(5000).optional(),
    prioridad: z.enum(PRIORIDADES).optional(),
    // null quita la fecha límite.
    fechaLimite: fecha.nullable().optional(),
    responsableId: z.number().int().positive().optional(),
    etiquetas: etiquetas.optional(),
  })
  .refine((cambios) => Object.keys(cambios).length > 0, {
    error: 'Indica al menos un campo que cambiar',
  });

export const esquemaCambiarEstado = z.strictObject({
  estado: z.enum(ESTADOS),
});

// Los query params llegan siempre como texto: z.coerce los convierte a número.
export const esquemaListadoTareas = z
  .strictObject({
    pagina: z.coerce.number().int().min(1).default(1),
    tamanoPagina: z.coerce.number().int().min(1).max(100).default(20),
    estado: z.enum(ESTADOS).optional(),
    prioridad: z.enum(PRIORIDADES).optional(),
    responsableId: z.coerce.number().int().positive().optional(),
    texto: z.string().trim().min(1).max(100).optional(),
    ordenarPor: z.enum(['id', 'prioridad', 'fechaLimite']).default('id'),
    direccion: z.enum(['asc', 'desc']).default('asc'),
  })
  .transform(
    (q): Required<Pick<ConsultaTareas, 'filtro' | 'orden' | 'pagina' | 'tamanoPagina'>> => ({
      pagina: q.pagina,
      tamanoPagina: q.tamanoPagina,
      filtro: {
        estado: q.estado,
        prioridad: q.prioridad,
        responsableId: q.responsableId,
        texto: q.texto,
      },
      orden: { campo: q.ordenarPor, direccion: q.direccion },
    }),
  );

export const esquemaCrearComentario = z.strictObject({
  autorId: z.number().int().positive(),
  texto: z.string().max(LONGITUD_MAXIMA_COMENTARIO),
});

// Lo que el cliente declara del fichero antes de subirlo, para pedir la URL firmada.
export const esquemaSolicitudSubida = z.strictObject({
  nombreArchivo: z.string().trim().min(1).max(255),
  tipoMime: z.enum(TIPOS_ADJUNTO_PERMITIDOS),
  tamanoBytes: z.number().int().positive().max(TAMANO_MAXIMO_ADJUNTO),
});

// Tras subir el fichero, el cliente confirma el adjunto con la clave que recibió.
export const esquemaRegistrarAdjunto = esquemaSolicitudSubida.extend({
  clave: z.string().min(1).max(500),
});
