import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Almacenamiento } from '../lib/almacenamiento';
import { repositorioAdjuntos, repositorioComentarios, repositorioTareas } from '../src/api/dependencias';
import { cargarDetalle } from '../src/services/detalleTarea';
import { cargarTablero } from '../src/services/tablero';
import { usarBdDePrueba } from './api/apiDePrueba';
import { urlBdDePrueba } from './bdDePrueba';

// Servicios que cargan los datos iniciales de las páginas (tablero y detalle de una tarea).

const almacen = vi.hoisted(() => ({
  caido: false,
  async urlDescarga(clave: string) {
    if (this.caido) throw new Error('almacenamiento caído');
    return `https://almacen.test/${clave}?descarga=x`;
  },
}));

vi.mock('../src/api/dependencias', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/api/dependencias')>()),
  almacenamiento: () => almacen as unknown as Almacenamiento,
}));

describe.skipIf(!urlBdDePrueba)('servicios de las páginas', () => {
  const usuarios = usarBdDePrueba();

  beforeEach(() => {
    almacen.caido = false;
  });

  describe('cargarTablero', () => {
    it('devuelve todas las tareas (con las fechas como texto) y los usuarios', async () => {
      const fechaLimite = new Date('2030-01-15T00:00:00.000Z');
      await repositorioTareas().crear({ titulo: 'Con fecha', responsableId: usuarios.ana, fechaLimite });
      await repositorioTareas().crear({ titulo: 'Sin fecha', responsableId: usuarios.bruno });

      const { tareas, usuarios: lista } = await cargarTablero();

      expect(tareas.map((t) => t.titulo).sort()).toEqual(['Con fecha', 'Sin fecha']);
      expect(tareas.find((t) => t.titulo === 'Con fecha')?.fechaLimite).toBe('2030-01-15T00:00:00.000Z');
      expect(tareas.find((t) => t.titulo === 'Sin fecha')).not.toHaveProperty('fechaLimite');
      expect(lista.map((u) => u.nombre)).toEqual(['Ana', 'Bruno']);
    });

    it('pide varias páginas si hay más tareas que el tamaño máximo de página', async () => {
      const repo = repositorioTareas();
      for (let i = 0; i < 101; i++) await repo.crear({ titulo: `Tarea ${i}`, responsableId: usuarios.ana });

      expect((await cargarTablero()).tareas).toHaveLength(101);
    });
  });

  describe('cargarDetalle', () => {
    it('devuelve undefined si la tarea no existe', async () => {
      expect(await cargarDetalle(999_999)).toBeUndefined();
    });

    it('junta la tarea, los usuarios, los comentarios y los adjuntos con su URL de descarga', async () => {
      const tarea = await repositorioTareas().crear({ titulo: 'Detalle', responsableId: usuarios.ana });
      await repositorioComentarios().crear(tarea.id, usuarios.bruno, 'Revisado');
      await repositorioAdjuntos().crear({
        tareaId: tarea.id,
        nombreArchivo: 'informe.pdf',
        tipoMime: 'application/pdf',
        tamanoBytes: 2048,
        clave: `tareas/${tarea.id}/informe.pdf`,
      });

      const detalle = await cargarDetalle(tarea.id);

      expect(detalle?.tarea).toMatchObject({ id: tarea.id, titulo: 'Detalle' });
      expect(detalle?.usuarios).toHaveLength(2);
      expect(detalle?.comentarios).toEqual([
        expect.objectContaining({ texto: 'Revisado', autor: { id: usuarios.bruno, nombre: 'Bruno' }, creadoEn: expect.any(String) }),
      ]);
      expect(detalle?.adjuntos).toEqual([
        expect.objectContaining({
          nombreArchivo: 'informe.pdf',
          urlDescarga: `https://almacen.test/tareas/${tarea.id}/informe.pdf?descarga=x`,
        }),
      ]);
      expect(detalle?.adjuntos?.[0]).not.toHaveProperty('clave');
    });

    it('si el almacenamiento falla, la tarea se carga igual con los adjuntos a null', async () => {
      const tarea = await repositorioTareas().crear({ titulo: 'Sin almacén', responsableId: usuarios.ana });
      await repositorioAdjuntos().crear({
        tareaId: tarea.id,
        nombreArchivo: 'a.txt',
        tipoMime: 'text/plain',
        tamanoBytes: 1,
        clave: `tareas/${tarea.id}/a.txt`,
      });
      almacen.caido = true;

      const detalle = await cargarDetalle(tarea.id);

      expect(detalle?.tarea.titulo).toBe('Sin almacén');
      expect(detalle?.adjuntos).toBeNull();
    });
  });
});
