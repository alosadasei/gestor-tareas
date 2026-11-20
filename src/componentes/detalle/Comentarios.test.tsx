// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { api, ErrorApi, type Comentario } from '../../cliente/api';
import { Comentarios } from './Comentarios';

const usuarios = [
  { id: 1, nombre: 'Ana García', email: 'ana@ejemplo.dev' },
  { id: 2, nombre: 'Bruno López', email: 'bruno@ejemplo.dev' },
];

const comentario = (id: number, texto: string, autor = usuarios[0]): Comentario => ({
  id,
  tareaId: 5,
  texto,
  creadoEn: '2026-11-20T09:30:00.000Z',
  autor,
});

const avisosFalsos = () => ({ aviso: null, exito: vi.fn(), error: vi.fn(), cerrar: vi.fn() });

function renderizar(iniciales: Comentario[] = []) {
  const avisos = avisosFalsos();
  render(<Comentarios tareaId={5} usuarios={usuarios} iniciales={iniciales} avisos={avisos} />);
  return { avisos, usuario: userEvent.setup() };
}

describe('Comentarios', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('lista los comentarios con su autor y la fecha en hora de Madrid', () => {
    renderizar([comentario(1, 'Primero'), comentario(2, 'Segundo', usuarios[1])]);

    const elementos = within(screen.getByRole('list')).getAllByRole('listitem');
    expect(elementos.map((e) => e.textContent)).toEqual([
      expect.stringContaining('Ana García'),
      expect.stringContaining('Bruno López'),
    ]);
    expect(screen.getAllByText('20 nov 2026, 10:30')[0].getAttribute('datetime')).toBe('2026-11-20T09:30:00.000Z');
  });

  it('avisa si no hay comentarios', () => {
    renderizar();
    expect(screen.getByText('Aún no hay comentarios.')).toBeTruthy();
  });

  it('no publica un comentario vacío', async () => {
    const comentar = vi.spyOn(api, 'comentar');
    const { usuario } = renderizar();

    await usuario.type(screen.getByLabelText('Nuevo comentario'), '   ');
    await usuario.click(screen.getByRole('button', { name: 'Comentar' }));

    expect(screen.getByText('Escribe el comentario antes de publicarlo')).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByLabelText('Nuevo comentario'));
    expect(comentar).not.toHaveBeenCalled();
  });

  it('publica con el autor elegido, lo añade al final y vacía el campo', async () => {
    const comentar = vi.spyOn(api, 'comentar').mockResolvedValue(comentario(3, 'Listo', usuarios[1]));
    const { usuario, avisos } = renderizar([comentario(1, 'Primero')]);

    await usuario.selectOptions(screen.getByLabelText('Comentar como'), '2');
    await usuario.type(screen.getByLabelText('Nuevo comentario'), 'Listo');
    await usuario.click(screen.getByRole('button', { name: 'Comentar' }));

    expect(comentar).toHaveBeenCalledWith(5, { autorId: 2, texto: 'Listo' });
    expect(screen.getAllByRole('listitem').at(-1)?.textContent).toContain('Listo');
    expect(screen.getByLabelText('Nuevo comentario')).toHaveProperty('value', '');
    expect(avisos.exito).toHaveBeenCalledWith('Comentario publicado.');
  });

  it('muestra el error de la API en el campo o, si es otro, en un aviso', async () => {
    const comentar = vi
      .spyOn(api, 'comentar')
      .mockRejectedValueOnce(new ErrorApi(400, 'VALIDACION', 'No válido', [{ campo: 'texto', mensaje: 'Demasiado largo' }]))
      .mockRejectedValueOnce(new ErrorApi(404, 'NO_ENCONTRADO', 'La tarea no existe'));
    const { usuario, avisos } = renderizar();

    await usuario.type(screen.getByLabelText('Nuevo comentario'), 'Hola');
    await usuario.click(screen.getByRole('button', { name: 'Comentar' }));
    expect(screen.getByText('Demasiado largo')).toBeTruthy();

    await usuario.click(screen.getByRole('button', { name: 'Comentar' }));
    expect(avisos.error).toHaveBeenCalledWith('No se ha podido publicar el comentario. La tarea no existe');
    expect(comentar).toHaveBeenCalledTimes(2);
  });
});
