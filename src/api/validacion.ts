import type { z } from 'zod';
import { ErrorValidacion, type DetalleValidacion } from '../domain/errores';

function detalles(error: z.ZodError): DetalleValidacion[] {
  return error.issues.map((issue) => ({
    campo: issue.path.join('.') || '(cuerpo)',
    mensaje: issue.message,
  }));
}

// Valida con el esquema y devuelve los datos ya transformados, o lanza un ErrorValidacion
// con un detalle por campo que el manejador convierte en un 400.
export function validar<T extends z.ZodType>(esquema: T, datos: unknown): z.output<T> {
  const resultado = esquema.safeParse(datos);
  if (!resultado.success) {
    throw new ErrorValidacion('Los datos enviados no son válidos', detalles(resultado.error));
  }
  return resultado.data;
}

export async function leerCuerpo<T extends z.ZodType>(req: Request, esquema: T): Promise<z.output<T>> {
  let datos: unknown;
  try {
    datos = await req.json();
  } catch {
    throw new ErrorValidacion('El cuerpo de la petición no es JSON válido');
  }
  return validar(esquema, datos);
}

export function leerQuery<T extends z.ZodType>(req: Request, esquema: T): z.output<T> {
  return validar(esquema, Object.fromEntries(new URL(req.url).searchParams));
}
