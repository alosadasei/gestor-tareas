import * as Sentry from '@sentry/nextjs';
import type { Logger } from 'pino';
import { logger } from '../../lib/logger';
import {
  ErrorConflicto,
  ErrorDominio,
  ErrorValidacion,
  type CodigoErrorDominio,
  type DetalleValidacion,
} from '../domain/errores';
import { Prisma } from '../generated/prisma/client';

// Formato único de los errores de la API, sea cual sea su origen.
export type CuerpoError = {
  error: {
    code: CodigoErrorDominio | 'ERROR_INTERNO';
    message: string;
    details?: DetalleValidacion[];
    requestId: string;
  };
};

export type ContextoPeticion = { requestId: string; log: Logger };

type Manejador<C> = (req: Request, ctx: C & ContextoPeticion) => Promise<Response> | Response;

const ESTADO_HTTP: Record<CodigoErrorDominio, number> = {
  VALIDACION: 400,
  NO_ENCONTRADO: 404,
  CONFLICTO: 409,
};

// Solo se reutiliza el id que llega de fuera (un proxy, otro servicio) si tiene un formato
// razonable: se escribe en los logs y no debe permitir inyectar texto arbitrario.
const FORMATO_REQUEST_ID = /^[\w.:-]{1,128}$/;

function obtenerRequestId(req: Request): string {
  const recibido = req.headers.get('x-request-id');
  return recibido && FORMATO_REQUEST_ID.test(recibido) ? recibido : crypto.randomUUID();
}

// Algunos errores de la BD son en realidad errores de dominio: se traducen para responder
// con el código adecuado en vez de un 500.
function traducirErrorPrisma(error: unknown): ErrorDominio | undefined {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return undefined;
  switch (error.code) {
    case 'P2002': // violación de unicidad
      return new ErrorConflicto('Ya existe un recurso con ese valor');
    case 'P2003': // clave foránea: p. ej. un responsableId que no existe
      return new ErrorValidacion('Se hace referencia a un recurso que no existe');
    case 'P2025': // el registro a modificar no existe
      return new ErrorDominio('NO_ENCONTRADO', 'El recurso no existe');
    default:
      return undefined;
  }
}

function respuestaDeError(error: unknown, requestId: string, log: Logger): Response {
  const deDominio = error instanceof ErrorDominio ? error : traducirErrorPrisma(error);

  if (deDominio) {
    const cuerpo: CuerpoError = {
      error: { code: deDominio.codigo, message: deDominio.message, requestId },
    };
    if (deDominio instanceof ErrorValidacion && deDominio.detalles.length > 0) {
      cuerpo.error.details = deDominio.detalles;
    }
    log.info({ codigo: deDominio.codigo, mensaje: deDominio.message }, 'error de dominio');
    return Response.json(cuerpo, { status: ESTADO_HTTP[deDominio.codigo] });
  }

  // Error técnico: se registra entero (log y Sentry, enlazados por el requestId), pero al
  // cliente solo le llega un mensaje genérico, sin trazas ni detalles internos.
  log.error({ err: error }, 'error no controlado');
  Sentry.captureException(error, { tags: { requestId } });
  const cuerpo: CuerpoError = {
    error: { code: 'ERROR_INTERNO', message: 'Error interno del servidor', requestId },
  };
  return Response.json(cuerpo, { status: 500 });
}

// Envuelve un route handler: le da un requestId y un logger con ese id, convierte cualquier
// error en una respuesta con el formato común, añade la cabecera x-request-id y deja una
// línea de log por petición con el estado y la duración.
export function conManejoErrores<C extends object = object>(manejador: Manejador<C>) {
  return async (req: Request, ctx: C): Promise<Response> => {
    const inicio = performance.now();
    const requestId = obtenerRequestId(req);
    const log = logger.child({ requestId, metodo: req.method, ruta: new URL(req.url).pathname });

    let respuesta: Response;
    try {
      respuesta = await manejador(req, { ...ctx, requestId, log });
    } catch (error) {
      respuesta = respuestaDeError(error, requestId, log);
    }

    respuesta.headers.set('x-request-id', requestId);
    log.info(
      { estado: respuesta.status, duracionMs: Math.round(performance.now() - inicio) },
      'petición completada',
    );
    return respuesta;
  };
}
