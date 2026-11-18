import { describe, expect, it } from 'vitest';
import { GET as GET_ETIQUETAS } from '../../src/app/api/etiquetas/route';
import { DELETE } from '../../src/app/api/tareas/[id]/route';
import { POST } from '../../src/app/api/tareas/route';
import { GET as GET_USUARIOS } from '../../src/app/api/usuarios/route';
import { urlBdDePrueba } from '../bdDePrueba';
import { conId, peticion, usarBdDePrueba } from './apiDePrueba';

describe.skipIf(!urlBdDePrueba)('catálogos', () => {
  const usuarios = usarBdDePrueba();

  it('GET /api/usuarios lista los usuarios por nombre', async () => {
    const respuesta = await GET_USUARIOS(peticion('GET', '/api/usuarios'), {});
    expect(respuesta.status).toBe(200);
    expect(await respuesta.json()).toEqual({
      data: [
        { id: usuarios.ana, nombre: 'Ana', email: 'ana@test.dev' },
        { id: usuarios.bruno, nombre: 'Bruno', email: 'bruno@test.dev' },
      ],
    });
  });

  it('GET /api/etiquetas cuenta solo las tareas no borradas', async () => {
    const crear = async (etiquetas: string[]) =>
      (
        await (
          await POST(peticion('POST', '/api/tareas', { titulo: 'T', responsableId: usuarios.ana, etiquetas }), {})
        ).json()
      ).id;
    await crear(['bug', 'frontend']);
    const borrada = await crear(['bug']);
    await DELETE(peticion('DELETE', `/api/tareas/${borrada}`), conId(borrada));

    const respuesta = await GET_ETIQUETAS(peticion('GET', '/api/etiquetas'), {});
    expect((await respuesta.json()).data).toEqual([
      { id: expect.any(Number), nombre: 'bug', tareas: 1 },
      { id: expect.any(Number), nombre: 'frontend', tareas: 1 },
    ]);
  });
});
