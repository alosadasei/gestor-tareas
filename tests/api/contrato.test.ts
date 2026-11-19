import { describe, expect, it } from 'vitest';
import type { z } from 'zod';
import {
  esquemaComentario,
  esquemaError,
  esquemaEstadisticas,
  esquemaListaComentarios,
  esquemaListaEtiquetas,
  esquemaListaUsuarios,
  esquemaPaginaTareas,
  esquemaSalud,
  esquemaTarea,
} from '../../src/api/esquemasRespuesta';
import { GET as GET_ESTADISTICAS } from '../../src/app/api/estadisticas/route';
import { GET as GET_ETIQUETAS } from '../../src/app/api/etiquetas/route';
import { GET as GET_SALUD } from '../../src/app/api/health/route';
import {
  GET as GET_COMENTARIOS,
  POST as POST_COMENTARIO,
} from '../../src/app/api/tareas/[id]/comentarios/route';
import { PATCH as PATCH_ESTADO } from '../../src/app/api/tareas/[id]/estado/route';
import { GET as GET_TAREA, PATCH } from '../../src/app/api/tareas/[id]/route';
import { GET as GET_TAREAS, POST } from '../../src/app/api/tareas/route';
import { GET as GET_USUARIOS } from '../../src/app/api/usuarios/route';
import { urlBdDePrueba } from '../bdDePrueba';
import { conId, peticion, usarBdDePrueba } from './apiDePrueba';

const DIA_MS = 24 * 60 * 60 * 1000;

// Contrato: las respuestas reales de la API cumplen los esquemas que publica la
// documentación OpenAPI. Los esquemas son estrictos, así que un campo de más o de menos,
// o con otro tipo, rompe el test. (Los adjuntos se comprueban en adjuntos.test.ts.)
async function cumple(respuesta: Response, estado: number, esquema: z.ZodType) {
  expect(respuesta.status).toBe(estado);
  const cuerpo = await respuesta.json();
  const resultado = esquema.safeParse(cuerpo);
  expect(resultado.error?.issues ?? []).toEqual([]);
  return cuerpo;
}

describe.skipIf(!urlBdDePrueba)('contrato de la API con su documentación', () => {
  const usuarios = usarBdDePrueba();

  it('tareas: crear, obtener, editar, cambiar estado y listar', async () => {
    const creada = await cumple(
      await POST(
        peticion('POST', '/api/tareas', {
          titulo: 'Con todo',
          responsableId: usuarios.ana,
          fechaLimite: new Date(Date.now() + DIA_MS).toISOString(),
          etiquetas: ['a'],
        }),
        {},
      ),
      201,
      esquemaTarea,
    );
    await cumple(await POST(peticion('POST', '/api/tareas', { titulo: 'Sin fecha', responsableId: usuarios.bruno }), {}), 201, esquemaTarea);

    await cumple(await GET_TAREA(peticion('GET', `/api/tareas/${creada.id}`), conId(creada.id)), 200, esquemaTarea);
    await cumple(
      await PATCH(peticion('PATCH', `/api/tareas/${creada.id}`, { fechaLimite: null }), conId(creada.id)),
      200,
      esquemaTarea,
    );
    await cumple(
      await PATCH_ESTADO(peticion('PATCH', `/api/tareas/${creada.id}/estado`, { estado: 'hecha' }), conId(creada.id)),
      200,
      esquemaTarea,
    );
    await cumple(await GET_TAREAS(peticion('GET', '/api/tareas'), {}), 200, esquemaPaginaTareas);
  });

  it('comentarios', async () => {
    const { id } = await (await POST(peticion('POST', '/api/tareas', { titulo: 'T', responsableId: usuarios.ana }), {})).json();
    await cumple(
      await POST_COMENTARIO(peticion('POST', `/api/tareas/${id}/comentarios`, { autorId: usuarios.bruno, texto: 'Hola' }), conId(id)),
      201,
      esquemaComentario,
    );
    await cumple(await GET_COMENTARIOS(peticion('GET', `/api/tareas/${id}/comentarios`), conId(id)), 200, esquemaListaComentarios);
  });

  it('catálogos, estadísticas y health check', async () => {
    await POST(peticion('POST', '/api/tareas', { titulo: 'T', responsableId: usuarios.ana, etiquetas: ['x'] }), {});
    await cumple(await GET_USUARIOS(peticion('GET', '/api/usuarios'), {}), 200, esquemaListaUsuarios);
    await cumple(await GET_ETIQUETAS(peticion('GET', '/api/etiquetas'), {}), 200, esquemaListaEtiquetas);
    await cumple(await GET_ESTADISTICAS(peticion('GET', '/api/estadisticas'), {}), 200, esquemaEstadisticas);
    await cumple(await GET_SALUD(peticion('GET', '/api/health'), {}), 200, esquemaSalud);
  });

  it('errores de validación (con detalles) y de recurso no encontrado', async () => {
    const validacion = await cumple(await POST(peticion('POST', '/api/tareas', { titulo: 1 }), {}), 400, esquemaError);
    expect(validacion.error.details.length).toBeGreaterThan(0);
    await cumple(await GET_TAREA(peticion('GET', '/api/tareas/999'), conId(999)), 404, esquemaError);
  });
});
