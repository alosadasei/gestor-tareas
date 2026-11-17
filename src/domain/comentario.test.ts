import { describe, expect, it } from 'vitest';
import { crearComentario, LONGITUD_MAXIMA_COMENTARIO } from './comentario';

describe('crearComentario', () => {
  it('guarda autor, tarea, texto recortado y fecha', () => {
    const fecha = new Date('2026-11-17T10:00:00Z');
    expect(crearComentario(1, 10, 3, '  Revisado  ', fecha)).toEqual({
      id: 1,
      tareaId: 10,
      autorId: 3,
      texto: 'Revisado',
      creadoEn: fecha,
    });
  });

  it('usa la fecha actual si no se indica', () => {
    const antes = Date.now();
    const comentario = crearComentario(1, 10, 3, 'Hola');
    expect(comentario.creadoEn.getTime()).toBeGreaterThanOrEqual(antes);
  });

  it('rechaza un comentario vacío', () => {
    expect(() => crearComentario(1, 10, 3, '   ')).toThrow('vacío');
  });

  it('acepta el máximo de caracteres y rechaza uno más', () => {
    const maximo = 'a'.repeat(LONGITUD_MAXIMA_COMENTARIO);
    expect(crearComentario(1, 10, 3, maximo).texto).toHaveLength(LONGITUD_MAXIMA_COMENTARIO);
    expect(() => crearComentario(1, 10, 3, maximo + 'a')).toThrow('superar');
  });
});
