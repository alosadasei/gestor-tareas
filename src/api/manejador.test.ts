import * as Sentry from '@sentry/nextjs';
import { Writable } from 'node:stream';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { crearLogger, logger } from '../../lib/logger';
import {
  ErrorConflicto,
  ErrorNoEncontrado,
  ErrorValidacion,
} from '../domain/errores';
import { Prisma } from '../generated/prisma/client';
import { conManejoErrores } from './manejador';

vi.mock('@sentry/nextjs', () => ({ captureException: vi.fn() }));

const peticion = (cabeceras: Record<string, string> = {}) =>
  new Request('http://localhost/api/tareas?pagina=2', { method: 'POST', headers: cabeceras });

function errorPrisma(code: string) {
  return new Prisma.PrismaClientKnownRequestError('fallo', { code, clientVersion: 'test' });
}

describe('conManejoErrores', () => {
  let lineas: Record<string, unknown>[];

  beforeEach(() => {
    // Logger real que escribe en memoria, para comprobar qué se registra.
    lineas = [];
    const destino = new Writable({
      write(trozo, _codificacion, listo) {
        lineas.push(JSON.parse(trozo.toString()));
        listo();
      },
    });
    const enMemoria = crearLogger(destino);
    enMemoria.level = 'info';
    vi.spyOn(logger, 'child').mockImplementation((bindings) => enMemoria.child(bindings));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.mocked(Sentry.captureException).mockClear();
  });

  it('pasa la respuesta del manejador y le añade un x-request-id nuevo', async () => {
    const GET = conManejoErrores(async () => Response.json({ ok: true }, { status: 201 }));
    const respuesta = await GET(peticion(), {});

    expect(respuesta.status).toBe(201);
    expect(await respuesta.json()).toEqual({ ok: true });
    expect(respuesta.headers.get('x-request-id')).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('reutiliza el x-request-id recibido si es válido y descarta uno sospechoso', async () => {
    const GET = conManejoErrores(async () => new Response(null, { status: 204 }));
    const valida = await GET(peticion({ 'x-request-id': 'cdg1::abc-123' }), {});
    expect(valida.headers.get('x-request-id')).toBe('cdg1::abc-123');

    const sospechosa = await GET(peticion({ 'x-request-id': 'a" {"falso":true}' }), {});
    expect(sospechosa.headers.get('x-request-id')).not.toContain('falso');
  });

  it('entrega al manejador el requestId, el logger y el contexto de Next', async () => {
    const GET = conManejoErrores<{ params: Promise<{ id: string }> }>(async (_req, ctx) => {
      const { id } = await ctx.params;
      ctx.log.info('dentro del manejador');
      return Response.json({ id, requestId: ctx.requestId });
    });
    const respuesta = await GET(peticion(), { params: Promise.resolve({ id: '7' }) });
    const cuerpo = await respuesta.json();

    expect(cuerpo.id).toBe('7');
    expect(cuerpo.requestId).toBe(respuesta.headers.get('x-request-id'));
    expect(lineas[0]).toMatchObject({ msg: 'dentro del manejador', requestId: cuerpo.requestId });
  });

  it('deja una línea de log estructurada por petición', async () => {
    const GET = conManejoErrores(async () => Response.json({}, { status: 200 }));
    const respuesta = await GET(peticion(), {});

    expect(lineas.at(-1)).toMatchObject({
      level: 30,
      msg: 'petición completada',
      app: 'gestor-tareas',
      requestId: respuesta.headers.get('x-request-id'),
      metodo: 'POST',
      ruta: '/api/tareas',
      estado: 200,
      duracionMs: expect.any(Number),
    });
  });

  it.each([
    [new ErrorValidacion('Datos no válidos', [{ campo: 'titulo', mensaje: 'Obligatorio' }]), 400, 'VALIDACION'],
    [new ErrorNoEncontrado('Tarea', 9), 404, 'NO_ENCONTRADO'],
    [new ErrorConflicto('Ya existe'), 409, 'CONFLICTO'],
  ])('convierte %s en %i con el formato común', async (error, estado, code) => {
    const GET = conManejoErrores(async () => {
      throw error;
    });
    const respuesta = await GET(peticion(), {});
    const cuerpo = await respuesta.json();

    expect(respuesta.status).toBe(estado);
    expect(cuerpo.error).toMatchObject({
      code,
      message: error.message,
      requestId: respuesta.headers.get('x-request-id'),
    });
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });

  it('incluye los detalles de validación solo si los hay', async () => {
    const conDetalles = conManejoErrores(async () => {
      throw new ErrorValidacion('Datos no válidos', [{ campo: 'titulo', mensaje: 'Obligatorio' }]);
    });
    const sinDetalles = conManejoErrores(async () => {
      throw new ErrorValidacion('El título no puede estar vacío');
    });

    expect((await (await conDetalles(peticion(), {})).json()).error.details).toEqual([
      { campo: 'titulo', mensaje: 'Obligatorio' },
    ]);
    expect((await (await sinDetalles(peticion(), {})).json()).error).not.toHaveProperty('details');
  });

  it.each([
    ['P2002', 409, 'CONFLICTO'],
    ['P2003', 400, 'VALIDACION'],
    ['P2025', 404, 'NO_ENCONTRADO'],
  ])('traduce el error de Prisma %s a %i', async (codigoPrisma, estado, code) => {
    const GET = conManejoErrores(async () => {
      throw errorPrisma(codigoPrisma);
    });
    const respuesta = await GET(peticion(), {});

    expect(respuesta.status).toBe(estado);
    expect((await respuesta.json()).error.code).toBe(code);
  });

  it('responde 500 genérico a un error técnico, sin filtrar detalles, y lo envía a Sentry', async () => {
    const fallo = new Error('connection refused at 10.0.0.3:5432');
    const GET = conManejoErrores(async () => {
      throw fallo;
    });
    const respuesta = await GET(peticion(), {});
    const requestId = respuesta.headers.get('x-request-id');
    const texto = await respuesta.text();

    expect(respuesta.status).toBe(500);
    expect(JSON.parse(texto)).toEqual({
      error: { code: 'ERROR_INTERNO', message: 'Error interno del servidor', requestId },
    });
    expect(texto).not.toContain('10.0.0.3');
    expect(Sentry.captureException).toHaveBeenCalledWith(fallo, { tags: { requestId } });
    expect(lineas.find((l) => l.msg === 'error no controlado')).toMatchObject({
      level: 50,
      requestId,
      err: { message: 'connection refused at 10.0.0.3:5432' },
    });
  });

  it('trata como técnico un error de Prisma sin traducción', async () => {
    const GET = conManejoErrores(async () => {
      throw errorPrisma('P1001');
    });
    expect((await GET(peticion(), {})).status).toBe(500);
  });
});
