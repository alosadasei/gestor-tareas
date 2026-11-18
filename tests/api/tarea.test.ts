import { beforeEach, describe, expect, it } from 'vitest';
import { PATCH as PATCH_ESTADO } from '../../src/app/api/tareas/[id]/estado/route';
import { DELETE, GET, PATCH } from '../../src/app/api/tareas/[id]/route';
import { POST } from '../../src/app/api/tareas/route';
import { urlBdDePrueba } from '../bdDePrueba';
import { conId, peticion, usarBdDePrueba } from './apiDePrueba';

const DIA_MS = 24 * 60 * 60 * 1000;
const enDias = (dias: number) => new Date(Date.now() + dias * DIA_MS).toISOString();

describe.skipIf(!urlBdDePrueba)('/api/tareas/:id', () => {
  const usuarios = usarBdDePrueba();
  let id: number;

  beforeEach(async () => {
    const respuesta = await POST(
      peticion('POST', '/api/tareas', {
        titulo: 'Original',
        responsableId: usuarios.ana,
        fechaLimite: enDias(2),
        etiquetas: ['a'],
      }),
      {},
    );
    id = (await respuesta.json()).id;
  });

  const obtener = (idRuta: number | string = id) =>
    GET(peticion('GET', `/api/tareas/${idRuta}`), conId(idRuta));
  const editar = (cuerpo: unknown, idRuta: number | string = id) =>
    PATCH(peticion('PATCH', `/api/tareas/${idRuta}`, cuerpo), conId(idRuta));
  const cambiarEstado = (cuerpo: unknown, idRuta: number | string = id) =>
    PATCH_ESTADO(peticion('PATCH', `/api/tareas/${idRuta}/estado`, cuerpo), conId(idRuta));
  const borrar = (idRuta: number | string = id) =>
    DELETE(peticion('DELETE', `/api/tareas/${idRuta}`), conId(idRuta));

  describe('GET', () => {
    it('devuelve la tarea', async () => {
      const respuesta = await obtener();
      expect(respuesta.status).toBe(200);
      expect(await respuesta.json()).toMatchObject({ id, titulo: 'Original', etiquetas: ['a'] });
    });

    it('responde 404 si no existe', async () => {
      const respuesta = await obtener(9999);
      expect(respuesta.status).toBe(404);
      expect((await respuesta.json()).error).toMatchObject({
        code: 'NO_ENCONTRADO',
        message: 'Tarea 9999 no existe',
      });
    });

    it('responde 400 si el id no es un entero positivo', async () => {
      expect((await obtener('abc')).status).toBe(400);
      expect((await obtener('0')).status).toBe(400);
    });
  });

  describe('PATCH', () => {
    it('aplica solo los campos enviados', async () => {
      const respuesta = await editar({ titulo: 'Editada', prioridad: 'alta' });
      expect(respuesta.status).toBe(200);
      expect(await respuesta.json()).toMatchObject({
        titulo: 'Editada',
        prioridad: 'alta',
        etiquetas: ['a'],
        fechaLimite: expect.any(String),
      });
    });

    it('quita la fecha límite con null', async () => {
      const tarea = await (await editar({ fechaLimite: null })).json();
      expect(tarea).not.toHaveProperty('fechaLimite');
    });

    it('responde 400 sin cambios, con campos desconocidos o intentando cambiar el estado', async () => {
      expect((await editar({})).status).toBe(400);
      expect((await editar({ titlo: 'X' })).status).toBe(400);
      expect((await editar({ estado: 'hecha' })).status).toBe(400);
    });

    it('responde 404 si no existe', async () => {
      expect((await editar({ titulo: 'X' }, 9999)).status).toBe(404);
    });
  });

  describe('PATCH /estado', () => {
    it('cambia el estado de la tarea', async () => {
      const respuesta = await cambiarEstado({ estado: 'en-curso' });
      expect(respuesta.status).toBe(200);
      expect((await respuesta.json()).estado).toBe('en-curso');
      expect((await (await obtener()).json()).estado).toBe('en-curso');
    });

    it('responde 400 con un estado que no existe y 404 si la tarea no existe', async () => {
      expect((await cambiarEstado({ estado: 'archivada' })).status).toBe(400);
      expect((await cambiarEstado({ estado: 'hecha' }, 9999)).status).toBe(404);
    });
  });

  describe('DELETE', () => {
    it('responde 204 sin cuerpo y la tarea deja de existir para la API', async () => {
      const respuesta = await borrar();
      expect(respuesta.status).toBe(204);
      expect(await respuesta.text()).toBe('');

      expect((await obtener()).status).toBe(404);
      expect((await editar({ titulo: 'X' })).status).toBe(404);
      expect((await borrar()).status).toBe(404);
    });
  });
});
