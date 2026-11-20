// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { adjuntarArchivo, api, ErrorApi, type Adjunto } from '../../cliente/api';
import { Adjuntos } from './Adjuntos';

// adjuntarArchivo encadena tres peticiones (pedir URL, subir, registrar): se sustituye entera.
vi.mock('../../cliente/api', async (original) => ({
  ...(await original<typeof import('../../cliente/api')>()),
  adjuntarArchivo: vi.fn(),
}));

const adjunto = (id: number, nombreArchivo: string): Adjunto => ({
  id,
  tareaId: 5,
  nombreArchivo,
  tipoMime: 'application/pdf',
  tamanoBytes: 2048,
  subidoEn: '2026-11-20T09:30:00.000Z',
  urlDescarga: `https://almacen.test/${nombreArchivo}?firma=x`,
});

const avisosFalsos = () => ({ aviso: null, exito: vi.fn(), error: vi.fn(), cerrar: vi.fn() });

function renderizar(iniciales: Adjunto[] | null = []) {
  const avisos = avisosFalsos();
  render(<Adjuntos tareaId={5} iniciales={iniciales} avisos={avisos} />);
  return { avisos, usuario: userEvent.setup({ applyAccept: false }) };
}

describe('Adjuntos', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.mocked(adjuntarArchivo).mockReset();
  });

  it('lista los adjuntos con enlace de descarga, tipo y tamaño', () => {
    renderizar([adjunto(1, 'informe.pdf')]);

    const enlace = screen.getByRole('link', { name: 'informe.pdf' });
    expect(enlace.getAttribute('href')).toBe('https://almacen.test/informe.pdf?firma=x');
    expect(enlace.parentElement?.textContent).toContain('PDF · 2 KB');
  });

  it('si el almacenamiento falla, lo dice en vez de mostrar el formulario', () => {
    renderizar(null);
    expect(screen.getByText('Los adjuntos no están disponibles en este momento.')).toBeTruthy();
    expect(screen.queryByLabelText('Adjuntar archivo')).toBeNull();
  });

  it('pide elegir un archivo antes de subir', async () => {
    const { usuario } = renderizar();
    await usuario.click(screen.getByRole('button', { name: 'Subir' }));
    expect(screen.getByText('Elige un archivo')).toBeTruthy();
  });

  it('rechaza en el navegador los tipos no permitidos, sin subir nada', async () => {
    const { usuario } = renderizar();

    const ejecutable = new File(['MZ'], 'programa.exe', { type: 'application/x-msdownload' });
    await usuario.upload(screen.getByLabelText('Adjuntar archivo'), ejecutable);
    await usuario.click(screen.getByRole('button', { name: 'Subir' }));

    expect(screen.getByLabelText('Adjuntar archivo')).toHaveProperty('ariaInvalid', 'true');
    expect(adjuntarArchivo).not.toHaveBeenCalled();
  });

  it('sube el archivo y lo añade a la lista', async () => {
    vi.mocked(adjuntarArchivo).mockResolvedValue(adjunto(2, 'notas.pdf'));
    const { usuario, avisos } = renderizar();

    const archivo = new File(['%PDF'], 'notas.pdf', { type: 'application/pdf' });
    await usuario.upload(screen.getByLabelText('Adjuntar archivo'), archivo);
    await usuario.click(screen.getByRole('button', { name: 'Subir' }));

    expect(adjuntarArchivo).toHaveBeenCalledWith(5, archivo);
    expect(screen.getByRole('link', { name: 'notas.pdf' })).toBeTruthy();
    expect(avisos.exito).toHaveBeenCalledWith('«notas.pdf» adjuntado.');
  });

  it('avisa si la subida falla', async () => {
    vi.mocked(adjuntarArchivo).mockRejectedValue(new ErrorApi(0, 'SIN_CONEXION', 'Revisa tu conexión.'));
    const { usuario, avisos } = renderizar();

    await usuario.upload(screen.getByLabelText('Adjuntar archivo'), new File(['x'], 'a.txt', { type: 'text/plain' }));
    await usuario.click(screen.getByRole('button', { name: 'Subir' }));

    expect(avisos.error).toHaveBeenCalledWith('No se ha podido subir el archivo. Revisa tu conexión.');
  });

  it('borra tras confirmar y lleva el foco al título de la sección', async () => {
    const borrar = vi.spyOn(api, 'borrarAdjunto').mockResolvedValue(undefined);
    const { usuario, avisos } = renderizar([adjunto(1, 'informe.pdf')]);

    await usuario.click(screen.getByRole('button', { name: 'Borrar «informe.pdf»' }));
    const dialogo = screen.getByRole('dialog', { name: 'Borrar archivo' });
    await usuario.click(within(dialogo).getByRole('button', { name: 'Borrar' }));

    expect(borrar).toHaveBeenCalledWith(1);
    expect(screen.queryByRole('link', { name: 'informe.pdf' })).toBeNull();
    expect(avisos.exito).toHaveBeenCalledWith('«informe.pdf» borrado.');
    expect(document.activeElement).toBe(screen.getByRole('heading', { name: /Adjuntos/ }));
  });

  it('cancelar el borrado no llama a la API', async () => {
    const borrar = vi.spyOn(api, 'borrarAdjunto');
    const { usuario } = renderizar([adjunto(1, 'informe.pdf')]);

    await usuario.click(screen.getByRole('button', { name: 'Borrar «informe.pdf»' }));
    await usuario.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(borrar).not.toHaveBeenCalled();
    expect(screen.getByRole('link', { name: 'informe.pdf' })).toBeTruthy();
  });
});
