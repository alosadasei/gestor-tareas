import { describe, expect, it } from 'vitest';
import { crearAdjunto, TAMANO_MAXIMO_ADJUNTO, validarAdjunto } from './adjunto';

const datos = {
  tareaId: 10,
  nombreArchivo: ' informe.pdf ',
  tipoMime: 'application/pdf',
  tamanoBytes: 2048,
  clave: 'tareas/10/abc-informe.pdf',
};

describe('crearAdjunto', () => {
  it('crea el adjunto con el nombre recortado y la fecha de subida', () => {
    const fecha = new Date('2026-11-17T10:00:00Z');
    expect(crearAdjunto(1, datos, fecha)).toEqual({
      id: 1,
      ...datos,
      nombreArchivo: 'informe.pdf',
      subidoEn: fecha,
    });
  });

  it('exige la clave del archivo en el almacenamiento', () => {
    expect(() => crearAdjunto(1, { ...datos, clave: '' })).toThrow('clave');
  });
});

describe('validarAdjunto', () => {
  it('acepta un archivo permitido en el límite de tamaño', () => {
    expect(() => validarAdjunto('foto.png', 'image/png', TAMANO_MAXIMO_ADJUNTO)).not.toThrow();
  });

  it('rechaza un nombre vacío', () => {
    expect(() => validarAdjunto(' ', 'image/png', 10)).toThrow('nombre');
  });

  it('rechaza un tipo no permitido', () => {
    expect(() => validarAdjunto('script.sh', 'application/x-sh', 10)).toThrow('no permitido');
  });

  it.each([0, -1, 1.5])('rechaza el tamaño %s', (tamano) => {
    expect(() => validarAdjunto('a.txt', 'text/plain', tamano)).toThrow('entero positivo');
  });

  it('rechaza un archivo mayor de 10 MB', () => {
    expect(() => validarAdjunto('a.txt', 'text/plain', TAMANO_MAXIMO_ADJUNTO + 1)).toThrow(
      'tamaño máximo',
    );
  });
});
