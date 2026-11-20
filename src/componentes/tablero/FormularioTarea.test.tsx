// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { api, ErrorApi, type Tarea } from '../../cliente/api';
import { FormularioTarea } from './FormularioTarea';

const usuarios = [
  { id: 1, nombre: 'Ana García', email: 'ana@ejemplo.dev' },
  { id: 2, nombre: 'Bruno López', email: 'bruno@ejemplo.dev' },
];

const tarea: Tarea = {
  id: 7,
  titulo: 'Preparar la demo',
  descripcion: '',
  estado: 'pendiente',
  prioridad: 'media',
  responsableId: 1,
  etiquetas: ['demo'],
};

function renderizar(props: { tarea?: Tarea } = {}) {
  const alGuardar = vi.fn();
  const alCancelar = vi.fn();
  render(<FormularioTarea usuarios={usuarios} alGuardar={alGuardar} alCancelar={alCancelar} {...props} />);
  return { alGuardar, alCancelar, usuario: userEvent.setup() };
}

describe('FormularioTarea', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('no envía nada si falta el título y enlaza el error con el campo', async () => {
    const crear = vi.spyOn(api, 'crearTarea');
    const { usuario, alGuardar } = renderizar();

    await usuario.click(screen.getByRole('button', { name: 'Crear tarea' }));

    const titulo = screen.getByLabelText('Título');
    expect(titulo).toHaveProperty('ariaInvalid', 'true');
    expect(titulo.getAttribute('aria-describedby')).toBe(screen.getByText('El título es obligatorio').id);
    expect(crear).not.toHaveBeenCalled();
    expect(alGuardar).not.toHaveBeenCalled();
  });

  it('crea la tarea con los datos del formulario', async () => {
    const creada = { ...tarea, id: 9, titulo: 'Nueva' };
    const crear = vi.spyOn(api, 'crearTarea').mockResolvedValue(creada);
    const { usuario, alGuardar } = renderizar();

    await usuario.type(screen.getByLabelText('Título'), '  Nueva ');
    await usuario.selectOptions(screen.getByLabelText('Prioridad'), 'alta');
    await usuario.selectOptions(screen.getByLabelText('Responsable'), '2');
    await usuario.type(screen.getByLabelText(/Etiquetas/), 'bug, frontend, bug');
    await usuario.click(screen.getByRole('button', { name: 'Crear tarea' }));

    expect(crear).toHaveBeenCalledWith({
      titulo: 'Nueva',
      descripcion: '',
      prioridad: 'alta',
      responsableId: 2,
      etiquetas: ['bug', 'frontend'],
    });
    expect(alGuardar).toHaveBeenCalledWith(creada);
  });

  it('al editar solo envía los campos cambiados', async () => {
    const editada = { ...tarea, titulo: 'Preparar la demo final' };
    const editar = vi.spyOn(api, 'editarTarea').mockResolvedValue(editada);
    const { usuario, alGuardar } = renderizar({ tarea });

    expect(screen.getByLabelText('Título')).toHaveProperty('value', 'Preparar la demo');
    await usuario.type(screen.getByLabelText('Título'), ' final');
    await usuario.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(editar).toHaveBeenCalledWith(7, { titulo: 'Preparar la demo final' });
    expect(alGuardar).toHaveBeenCalledWith(editada);
  });

  it('si no hay cambios no llama a la API', async () => {
    const editar = vi.spyOn(api, 'editarTarea');
    const { usuario, alGuardar } = renderizar({ tarea });

    await usuario.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(editar).not.toHaveBeenCalled();
    expect(alGuardar).toHaveBeenCalledWith(tarea);
  });

  it('muestra junto al campo el error que devuelve la API', async () => {
    vi.spyOn(api, 'crearTarea').mockRejectedValue(
      new ErrorApi(400, 'VALIDACION', 'Datos no válidos', [{ campo: 'titulo', mensaje: 'Ya existe una tarea así' }]),
    );
    const { usuario, alGuardar } = renderizar();

    await usuario.type(screen.getByLabelText('Título'), 'Repetida');
    await usuario.click(screen.getByRole('button', { name: 'Crear tarea' }));

    expect(screen.getByText('Ya existe una tarea así')).toBeTruthy();
    expect(alGuardar).not.toHaveBeenCalled();
  });

  it('muestra un aviso general si el error no es de un campo', async () => {
    vi.spyOn(api, 'crearTarea').mockRejectedValue(new ErrorApi(0, 'SIN_CONEXION', 'Sin conexión con el servidor'));
    const { usuario } = renderizar();

    await usuario.type(screen.getByLabelText('Título'), 'Algo');
    await usuario.click(screen.getByRole('button', { name: 'Crear tarea' }));

    expect(screen.getByRole('alert').textContent).toBe('Sin conexión con el servidor');
  });

  it('Cancelar avisa sin guardar', async () => {
    const { usuario, alCancelar, alGuardar } = renderizar();
    await usuario.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(alCancelar).toHaveBeenCalled();
    expect(alGuardar).not.toHaveBeenCalled();
  });
});
