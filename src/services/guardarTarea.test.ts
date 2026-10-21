import * as Sentry from '@sentry/nextjs';
import { describe, expect, it, vi } from 'vitest';
import { guardarTarea } from './guardarTarea';

vi.mock('@sentry/nextjs', () => ({ captureException: vi.fn() }));

describe('guardarTarea', () => {
  it('devuelve la tarea creada si todo va bien', () => {
    const resultado = guardarTarea(1, 'Escribir informe', 2);
    expect(resultado.ok).toBe(true);
  });

  it('captura el error en Sentry con el tag crear-tarea y devuelve un mensaje limpio', () => {
    const ayer = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    const resultado = guardarTarea(2, 'Tarea vencida', 1, ayer);

    expect(resultado).toEqual({ ok: false, mensaje: expect.not.stringContaining('anterior') });
    expect(Sentry.captureException).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ tags: { operacion: 'crear-tarea' } }),
    );
  });
});
