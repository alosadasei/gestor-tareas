import { beforeEach, describe, expect, it } from 'vitest';
import { GET, POST } from '../../src/app/api/tareas/[id]/comentarios/route';
import { DELETE } from '../../src/app/api/tareas/[id]/route';
import { POST as CREAR_TAREA } from '../../src/app/api/tareas/route';
import { urlBdDePrueba } from '../bdDePrueba';
import { conId, peticion, usarBdDePrueba } from './apiDePrueba';

describe.skipIf(!urlBdDePrueba)('/api/tareas/:id/comentarios', () => {
  const usuarios = usarBdDePrueba();
  let tareaId: number;

  beforeEach(async () => {
    const respuesta = await CREAR_TAREA(
      peticion('POST', '/api/tareas', { titulo: 'T', responsableId: usuarios.ana }),
      {},
    );
    tareaId = (await respuesta.json()).id;
  });

  const comentar = (cuerpo: unknown, id: number | string = tareaId) =>
    POST(peticion('POST', `/api/tareas/${id}/comentarios`, cuerpo), conId(id));
  const listar = (id: number | string = tareaId) =>
    GET(peticion('GET', `/api/tareas/${id}/comentarios`), conId(id));

  it('crea el comentario y responde 201 con su autor y fecha', async () => {
    const antes = Date.now();
    const respuesta = await comentar({ autorId: usuarios.bruno, texto: '  ¿Lo revisamos?  ' });
    const comentario = await respuesta.json();

    expect(respuesta.status).toBe(201);
    expect(comentario).toEqual({
      id: expect.any(Number),
      tareaId,
      texto: '¿Lo revisamos?',
      creadoEn: expect.any(String),
      autor: { id: usuarios.bruno, nombre: 'Bruno' },
    });
    expect(new Date(comentario.creadoEn).getTime()).toBeGreaterThanOrEqual(antes - 1000);
  });

  it('lista los comentarios de la tarea en orden de creación', async () => {
    await comentar({ autorId: usuarios.ana, texto: 'Primero' });
    await comentar({ autorId: usuarios.bruno, texto: 'Segundo' });

    const respuesta = await listar();
    expect(respuesta.status).toBe(200);
    const { data } = await respuesta.json();
    expect(data.map((c: { texto: string; autor: { nombre: string } }) => [c.autor.nombre, c.texto])).toEqual([
      ['Ana', 'Primero'],
      ['Bruno', 'Segundo'],
    ]);
  });

  it('devuelve una lista vacía si la tarea no tiene comentarios', async () => {
    expect(await (await listar()).json()).toEqual({ data: [] });
  });

  it('responde 400 si el texto está vacío, es demasiado largo o falta el autor', async () => {
    expect((await comentar({ autorId: usuarios.ana, texto: '   ' })).status).toBe(400);
    expect((await comentar({ autorId: usuarios.ana, texto: 'x'.repeat(2001) })).status).toBe(400);
    expect((await comentar({ texto: 'Hola' })).status).toBe(400);
  });

  it('responde 400 si el autor no existe', async () => {
    const respuesta = await comentar({ autorId: 9999, texto: 'Hola' });
    expect(respuesta.status).toBe(400);
  });

  it('responde 404 si la tarea no existe o está borrada', async () => {
    expect((await listar(9999)).status).toBe(404);
    expect((await comentar({ autorId: usuarios.ana, texto: 'Hola' }, 9999)).status).toBe(404);

    await DELETE(peticion('DELETE', `/api/tareas/${tareaId}`), conId(tareaId));
    expect((await listar()).status).toBe(404);
    expect((await comentar({ autorId: usuarios.ana, texto: 'Hola' })).status).toBe(404);
  });
});
