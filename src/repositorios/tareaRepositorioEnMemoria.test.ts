import { beforeEach, describe, expect, it } from 'vitest';
import { crearTarea, type Tarea } from '../domain/tarea';
import { TareaRepositorioEnMemoria } from './tareaRepositorioEnMemoria';

const DIA_MS = 24 * 60 * 60 * 1000;
const enDias = (dias: number) => new Date(Date.now() + dias * DIA_MS);

function tarea(id: number, cambios: Partial<Tarea> = {}): Tarea {
  return { ...crearTarea(id, { titulo: `Tarea ${id}`, responsableId: 1 }), ...cambios };
}

describe('TareaRepositorioEnMemoria', () => {
  let repo: TareaRepositorioEnMemoria;

  beforeEach(() => {
    repo = new TareaRepositorioEnMemoria([
      tarea(1, { prioridad: 'baja', fechaLimite: enDias(5) }),
      tarea(2, { prioridad: 'alta', estado: 'en-curso', responsableId: 2 }),
      tarea(3, { prioridad: 'media', fechaLimite: enDias(1), descripcion: 'Revisar el LOGIN' }),
      tarea(4, { prioridad: 'alta', estado: 'hecha', fechaLimite: enDias(3) }),
    ]);
  });

  describe('crear y obtener', () => {
    it('asigna ids consecutivos a partir de los existentes', async () => {
      const nueva = await repo.crear({ titulo: 'Nueva', responsableId: 1 });
      expect(nueva.id).toBe(5);
      expect(await repo.obtener(5)).toEqual(nueva);
    });

    it('devuelve undefined si la tarea no existe', async () => {
      expect(await repo.obtener(99)).toBeUndefined();
    });

    it('devuelve copias: modificar el resultado no cambia lo guardado', async () => {
      const obtenida = await repo.obtener(1);
      obtenida!.titulo = 'Cambiado fuera';
      expect((await repo.obtener(1))!.titulo).toBe('Tarea 1');
    });

    it('propaga la validación del dominio al crear', async () => {
      await expect(repo.crear({ titulo: '', responsableId: 1 })).rejects.toThrow('título');
    });
  });

  describe('listar', () => {
    it('sin consulta devuelve todas ordenadas por id con la paginación por defecto', async () => {
      const resultado = await repo.listar();
      expect(resultado.elementos.map((t) => t.id)).toEqual([1, 2, 3, 4]);
      expect(resultado).toMatchObject({ total: 4, pagina: 1, tamanoPagina: 20 });
    });

    it('filtra por estado, prioridad y responsable', async () => {
      const ids = async (filtro: object) =>
        (await repo.listar({ filtro })).elementos.map((t) => t.id);
      expect(await ids({ estado: 'en-curso' })).toEqual([2]);
      expect(await ids({ prioridad: 'alta' })).toEqual([2, 4]);
      expect(await ids({ responsableId: 2 })).toEqual([2]);
    });

    it('busca texto en título y descripción sin distinguir mayúsculas', async () => {
      const resultado = await repo.listar({ filtro: { texto: 'login' } });
      expect(resultado.elementos.map((t) => t.id)).toEqual([3]);
    });

    it('ordena por prioridad descendente desempatando por id', async () => {
      const resultado = await repo.listar({ orden: { campo: 'prioridad', direccion: 'desc' } });
      expect(resultado.elementos.map((t) => t.id)).toEqual([2, 4, 3, 1]);
    });

    it('ordena por fecha límite dejando al final las tareas sin fecha', async () => {
      const resultado = await repo.listar({ orden: { campo: 'fechaLimite', direccion: 'asc' } });
      expect(resultado.elementos.map((t) => t.id)).toEqual([3, 4, 1, 2]);
    });

    it('pagina el resultado y devuelve el total sin paginar', async () => {
      const resultado = await repo.listar({ pagina: 2, tamanoPagina: 3 });
      expect(resultado.elementos.map((t) => t.id)).toEqual([4]);
      expect(resultado.total).toBe(4);
    });

    it('corrige página y tamaño menores que 1', async () => {
      const resultado = await repo.listar({ pagina: 0, tamanoPagina: 0 });
      expect(resultado).toMatchObject({ pagina: 1, tamanoPagina: 1 });
      expect(resultado.elementos.map((t) => t.id)).toEqual([1]);
    });
  });

  describe('actualizar, cambiarEstado y borrar', () => {
    it('actualiza los campos indicados', async () => {
      const editada = await repo.actualizar(1, { titulo: 'Editada', prioridad: 'alta' });
      expect(editada).toMatchObject({ id: 1, titulo: 'Editada', prioridad: 'alta' });
      expect((await repo.obtener(1))!.titulo).toBe('Editada');
    });

    it('cambia el estado', async () => {
      expect((await repo.cambiarEstado(1, 'hecha'))!.estado).toBe('hecha');
    });

    it('devuelve undefined al actualizar o cambiar el estado de una tarea inexistente', async () => {
      expect(await repo.actualizar(99, { titulo: 'X' })).toBeUndefined();
      expect(await repo.cambiarEstado(99, 'hecha')).toBeUndefined();
    });

    it('borra la tarea e indica si existía', async () => {
      expect(await repo.borrar(1)).toBe(true);
      expect(await repo.obtener(1)).toBeUndefined();
      expect(await repo.borrar(1)).toBe(false);
    });
  });
});
