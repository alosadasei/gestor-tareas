import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { Tarea } from '../cliente/api';
import { TarjetaTarea } from './TarjetaTarea';

const base: Tarea = {
  id: 1,
  titulo: 'Preparar la demo',
  descripcion: '',
  estado: 'pendiente',
  prioridad: 'alta',
  responsableId: 1,
  etiquetas: ['demo', 'frontend'],
};

const html = (tarea: Tarea, responsable?: string) =>
  renderToStaticMarkup(<TarjetaTarea tarea={tarea} responsable={responsable} />);

describe('TarjetaTarea', () => {
  it('muestra título, prioridad (con texto para lectores), etiquetas y responsable', () => {
    const marcado = html(base, 'Ana García');
    expect(marcado).toContain('Preparar la demo');
    expect(marcado).toContain('Prioridad </span>Alta');
    expect(marcado).toContain('<li>demo</li><li>frontend</li>');
    expect(marcado).toContain('Responsable: </span>Ana García');
    expect(marcado).toContain('>AG</span>');
  });

  it('marca la fecha límite vencida si la tarea no está hecha', () => {
    const vencida = { ...base, fechaLimite: '2020-01-15T00:00:00.000Z' };
    expect(html(vencida)).toContain('· vencida');
    expect(html({ ...vencida, estado: 'hecha' })).not.toContain('vencida');
  });

  it('no rompe con tareas antiguas sin el campo etiquetas', () => {
    const antigua = { ...base, etiquetas: undefined } as unknown as Tarea;
    expect(html(antigua)).not.toContain('Etiquetas');
  });
});
