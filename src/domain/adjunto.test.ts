import { describe, expect, it } from 'vitest';
import {
  claveEsDeTarea,
  crearAdjunto,
  generarClaveAdjunto,
  TAMANO_MAXIMO_ADJUNTO,
  validarAdjunto,
} from './adjunto';

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

describe('generarClaveAdjunto', () => {
  it('agrupa por tarea, añade un uuid y sanea el nombre', () => {
    expect(generarClaveAdjunto(7, 'Informe final (versión 2).pdf', 'uuid-1')).toBe(
      'tareas/7/uuid-1/Informe_final_version_2_.pdf',
    );
  });

  it('genera claves distintas para el mismo nombre', () => {
    expect(generarClaveAdjunto(7, 'a.pdf')).not.toBe(generarClaveAdjunto(7, 'a.pdf'));
  });

  it('no deja que el nombre escape de la carpeta de la tarea', () => {
    const clave = generarClaveAdjunto(7, '../../otra/x.pdf', 'u');
    expect(clave).toBe('tareas/7/u/._._otra_x.pdf');
    expect(claveEsDeTarea(clave, 7)).toBe(true);
  });
});

describe('claveEsDeTarea', () => {
  it('acepta solo las claves de esa tarea', () => {
    expect(claveEsDeTarea('tareas/7/u/a.pdf', 7)).toBe(true);
    expect(claveEsDeTarea('tareas/70/u/a.pdf', 7)).toBe(false);
    expect(claveEsDeTarea('tareas/8/u/a.pdf', 7)).toBe(false);
    expect(claveEsDeTarea('tareas/7/../8/u/a.pdf', 7)).toBe(false);
  });
});
