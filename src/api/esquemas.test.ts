import { describe, expect, it } from 'vitest';
import { TAMANO_MAXIMO_ADJUNTO } from '../domain/adjunto';
import { ErrorValidacion } from '../domain/errores';
import {
  esquemaCambiarEstado,
  esquemaCrearComentario,
  esquemaCrearTarea,
  esquemaEditarTarea,
  esquemaId,
  esquemaListadoTareas,
  esquemaRegistrarAdjunto,
  esquemaSolicitudSubida,
} from './esquemas';
import { leerCuerpo, leerQuery, validar } from './validacion';

// Devuelve los campos con error, para comprobar qué rechaza cada esquema.
function camposConError(esquema: Parameters<typeof validar>[0], datos: unknown): string[] {
  try {
    validar(esquema, datos);
    return [];
  } catch (error) {
    return (error as ErrorValidacion).detalles.map((d) => d.campo);
  }
}

describe('esquemaCrearTarea', () => {
  it('acepta una tarea mínima y convierte la fecha límite a Date', () => {
    expect(validar(esquemaCrearTarea, { titulo: 'T', responsableId: 1 })).toEqual({
      titulo: 'T',
      responsableId: 1,
    });
    const conFecha = validar(esquemaCrearTarea, {
      titulo: 'T',
      responsableId: 1,
      fechaLimite: '2026-12-01',
    });
    expect(conFecha.fechaLimite).toEqual(new Date('2026-12-01'));
  });

  it('acepta fecha-hora con zona y rechaza formatos ambiguos', () => {
    const base = { titulo: 'T', responsableId: 1 };
    expect(
      validar(esquemaCrearTarea, { ...base, fechaLimite: '2026-12-01T18:00:00+01:00' }).fechaLimite,
    ).toEqual(new Date('2026-12-01T17:00:00Z'));
    expect(camposConError(esquemaCrearTarea, { ...base, fechaLimite: '01/12/2026' })).toEqual([
      'fechaLimite',
    ]);
  });

  it('señala cada campo inválido, los que faltan y los desconocidos', () => {
    expect(
      camposConError(esquemaCrearTarea, {
        titulo: 'x'.repeat(201),
        prioridad: 'urgente',
        etiquetas: [''],
        prioridd: 'alta',
      }),
    ).toEqual(['titulo', 'prioridad', 'responsableId', 'etiquetas.0', '(cuerpo)']);
  });

  it('da los mensajes en español', () => {
    try {
      validar(esquemaCrearTarea, { titulo: 'T', responsableId: -1 });
    } catch (error) {
      expect((error as ErrorValidacion).detalles[0].mensaje).toMatch(/se esperaba/);
    }
    expect.assertions(1);
  });
});

describe('esquemaEditarTarea', () => {
  it('acepta cambios parciales y fechaLimite null para quitarla', () => {
    expect(validar(esquemaEditarTarea, { prioridad: 'alta' })).toEqual({ prioridad: 'alta' });
    expect(validar(esquemaEditarTarea, { fechaLimite: null })).toEqual({ fechaLimite: null });
  });

  it('rechaza un cuerpo sin cambios', () => {
    expect(camposConError(esquemaEditarTarea, {})).toEqual(['(cuerpo)']);
  });
});

describe('esquemaCambiarEstado', () => {
  it('solo acepta los tres estados', () => {
    expect(validar(esquemaCambiarEstado, { estado: 'en-curso' })).toEqual({ estado: 'en-curso' });
    expect(camposConError(esquemaCambiarEstado, { estado: 'archivada' })).toEqual(['estado']);
  });
});

describe('esquemaListadoTareas', () => {
  it('aplica los valores por defecto y lo convierte en una consulta del repositorio', () => {
    expect(validar(esquemaListadoTareas, {})).toEqual({
      pagina: 1,
      tamanoPagina: 20,
      filtro: {},
      orden: { campo: 'id', direccion: 'asc' },
    });
  });

  it('convierte los query params de texto a número', () => {
    expect(
      validar(esquemaListadoTareas, {
        pagina: '3',
        tamanoPagina: '50',
        estado: 'hecha',
        responsableId: '2',
        texto: ' login ',
        ordenarPor: 'fechaLimite',
        direccion: 'desc',
      }),
    ).toEqual({
      pagina: 3,
      tamanoPagina: 50,
      filtro: { estado: 'hecha', responsableId: 2, texto: 'login' },
      orden: { campo: 'fechaLimite', direccion: 'desc' },
    });
  });

  it('limita el tamaño de página y rechaza valores fuera de rango', () => {
    expect(
      camposConError(esquemaListadoTareas, { pagina: '0', tamanoPagina: '1000', ordenarPor: 'titulo' }),
    ).toEqual(['pagina', 'tamanoPagina', 'ordenarPor']);
  });
});

describe('esquemaId', () => {
  it('acepta ids positivos como texto y rechaza el resto', () => {
    expect(validar(esquemaId, '42')).toBe(42);
    for (const id of ['0', '-1', '1.5', 'abc']) {
      expect(() => validar(esquemaId, id)).toThrow(ErrorValidacion);
    }
  });
});

describe('comentarios y adjuntos', () => {
  it('valida el comentario', () => {
    expect(validar(esquemaCrearComentario, { autorId: 1, texto: 'Hola' })).toEqual({
      autorId: 1,
      texto: 'Hola',
    });
    expect(camposConError(esquemaCrearComentario, { autorId: 1, texto: 'x'.repeat(2001) })).toEqual(
      ['texto'],
    );
  });

  it('valida la solicitud de subida con los límites del dominio', () => {
    const subida = { nombreArchivo: 'a.pdf', tipoMime: 'application/pdf', tamanoBytes: 10 };
    expect(validar(esquemaSolicitudSubida, subida)).toEqual(subida);
    expect(
      camposConError(esquemaSolicitudSubida, {
        nombreArchivo: ' ',
        tipoMime: 'application/x-sh',
        tamanoBytes: TAMANO_MAXIMO_ADJUNTO + 1,
      }),
    ).toEqual(['nombreArchivo', 'tipoMime', 'tamanoBytes']);
  });

  it('exige la clave al registrar el adjunto', () => {
    const subida = { nombreArchivo: 'a.pdf', tipoMime: 'application/pdf', tamanoBytes: 10 };
    expect(camposConError(esquemaRegistrarAdjunto, subida)).toEqual(['clave']);
  });
});

describe('leerCuerpo y leerQuery', () => {
  const post = (cuerpo: string) =>
    new Request('http://localhost/api/tareas', { method: 'POST', body: cuerpo });

  it('lee y valida el cuerpo JSON', async () => {
    const req = post(JSON.stringify({ estado: 'hecha' }));
    expect(await leerCuerpo(req, esquemaCambiarEstado)).toEqual({ estado: 'hecha' });
  });

  it('rechaza un cuerpo que no es JSON con un error de validación', async () => {
    await expect(leerCuerpo(post('{no es json'), esquemaCambiarEstado)).rejects.toThrow(
      'no es JSON válido',
    );
  });

  it('lee y valida los query params', () => {
    const req = new Request('http://localhost/api/tareas?pagina=2&estado=hecha');
    expect(leerQuery(req, esquemaListadoTareas)).toMatchObject({
      pagina: 2,
      filtro: { estado: 'hecha' },
    });
  });
});
