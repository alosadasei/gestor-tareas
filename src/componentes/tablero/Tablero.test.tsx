// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { api, ErrorApi, type Tarea } from '../../cliente/api';
import { Tablero } from './Tablero';

const usuarios = [
  { id: 1, nombre: 'Ana García', email: 'ana@ejemplo.dev' },
  { id: 2, nombre: 'Bruno López', email: 'bruno@ejemplo.dev' },
];

const tarea = (id: number, titulo: string, estado: Tarea['estado']): Tarea => ({
  id,
  titulo,
  descripcion: '',
  estado,
  prioridad: 'media',
  responsableId: 1,
  etiquetas: [],
});

const iniciales = [tarea(1, 'Escribir tests', 'pendiente'), tarea(2, 'Configurar CI', 'pendiente'), tarea(3, 'Desplegar', 'hecha')];

const columna = (nombre: RegExp) => screen.getByRole('region', { name: nombre });

function renderizar(tareas = iniciales) {
  render(<Tablero tareasIniciales={tareas} usuarios={usuarios} />);
  return userEvent.setup();
}

describe('Tablero', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('reparte las tareas por columnas con su contador y el porcentaje completado', () => {
    renderizar();

    expect(within(columna(/^Pendiente/)).getAllByRole('listitem')).toHaveLength(2);
    expect(columna(/^Pendiente/).querySelector('h2')?.textContent).toBe('Pendiente2 tareas');
    expect(within(columna(/^En curso/)).getByText('Sin tareas')).toBeTruthy();
    expect(screen.getByText('33%')).toBeTruthy();
  });

  it('sin tareas invita a crear la primera', () => {
    renderizar([]);
    expect(screen.getByText('Aún no hay tareas. Crea la primera con «Nueva tarea».')).toBeTruthy();
  });

  it('cambia de columna con el selector de estado y lo anuncia', async () => {
    const cambiar = vi.spyOn(api, 'cambiarEstado').mockResolvedValue(tarea(1, 'Escribir tests', 'en-curso'));
    const usuario = renderizar();

    await usuario.selectOptions(screen.getByLabelText('Estado de «Escribir tests»'), 'en-curso');

    expect(cambiar).toHaveBeenCalledWith(1, 'en-curso');
    expect(within(columna(/^En curso/)).getByText('Escribir tests')).toBeTruthy();
    expect(screen.getByText('«Escribir tests» movida a En curso.').closest('[role=status]')).toBeTruthy();
  });

  it('si la API falla, la tarjeta vuelve a su columna y se avisa del error', async () => {
    vi.spyOn(api, 'cambiarEstado').mockRejectedValue(new ErrorApi(500, 'ERROR_INTERNO', 'Error del servidor'));
    const usuario = renderizar();

    await usuario.selectOptions(screen.getByLabelText('Estado de «Escribir tests»'), 'hecha');

    expect(within(columna(/^Pendiente/)).getByText('Escribir tests')).toBeTruthy();
    expect(screen.getByRole('alert').textContent).toContain('No se ha podido mover «Escribir tests». Error del servidor');
  });

  it('crea una tarea desde el diálogo y la añade a Pendiente', async () => {
    vi.spyOn(api, 'crearTarea').mockResolvedValue(tarea(4, 'Revisar la PR', 'pendiente'));
    const usuario = renderizar();

    await usuario.click(screen.getByRole('button', { name: 'Nueva tarea' }));
    const dialogo = screen.getByRole('dialog', { name: 'Nueva tarea' });
    await usuario.type(within(dialogo).getByLabelText('Título'), 'Revisar la PR');
    await usuario.click(within(dialogo).getByRole('button', { name: 'Crear tarea' }));

    expect(within(columna(/^Pendiente/)).getByText('Revisar la PR')).toBeTruthy();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByText('Tarea «Revisar la PR» creada.').closest('[role=status]')).toBeTruthy();
  });

  it('edita una tarea con los datos actuales precargados', async () => {
    vi.spyOn(api, 'editarTarea').mockResolvedValue({ ...tarea(3, 'Desplegar en Vercel', 'hecha') });
    const usuario = renderizar();

    await usuario.click(screen.getByRole('button', { name: 'Editar «Desplegar»' }));
    const titulo = within(screen.getByRole('dialog', { name: 'Editar tarea' })).getByLabelText('Título');
    expect(titulo).toHaveProperty('value', 'Desplegar');
    await usuario.type(titulo, ' en Vercel');
    await usuario.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(screen.getByText('Desplegar en Vercel')).toBeTruthy();
  });

  it('borra tras confirmar y deja el foco en el encabezado de la columna', async () => {
    const borrar = vi.spyOn(api, 'borrarTarea').mockResolvedValue(undefined);
    const usuario = renderizar();

    await usuario.click(screen.getByRole('button', { name: 'Borrar «Configurar CI»' }));
    await usuario.click(within(screen.getByRole('dialog', { name: 'Borrar tarea' })).getByRole('button', { name: 'Borrar' }));

    expect(borrar).toHaveBeenCalledWith(2);
    expect(screen.queryByText('Configurar CI')).toBeNull();
    expect(document.activeElement).toBe(columna(/^Pendiente/).querySelector('h2'));
  });

  it('si no se puede borrar, la tarea se queda y se avisa', async () => {
    vi.spyOn(api, 'borrarTarea').mockRejectedValue(new ErrorApi(404, 'NO_ENCONTRADO', 'La tarea no existe'));
    const usuario = renderizar();

    await usuario.click(screen.getByRole('button', { name: 'Borrar «Configurar CI»' }));
    await usuario.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Borrar' }));

    expect(screen.getByText('Configurar CI')).toBeTruthy();
    expect(screen.getByRole('alert').textContent).toContain('No se ha podido borrar la tarea. La tarea no existe');
  });
});
