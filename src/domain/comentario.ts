import { ErrorValidacion } from './errores';

export const LONGITUD_MAXIMA_COMENTARIO = 2000;

export type Comentario = {
  id: number;
  tareaId: number;
  autorId: number;
  texto: string;
  creadoEn: Date;
};

export function crearComentario(
  id: number,
  tareaId: number,
  autorId: number,
  texto: string,
  creadoEn: Date = new Date(),
): Comentario {
  const limpio = texto.trim();
  if (limpio === '') {
    throw new ErrorValidacion('El comentario no puede estar vacío');
  }
  if (limpio.length > LONGITUD_MAXIMA_COMENTARIO) {
    throw new ErrorValidacion(`El comentario no puede superar ${LONGITUD_MAXIMA_COMENTARIO} caracteres`);
  }
  return { id, tareaId, autorId, texto: limpio, creadoEn };
}
