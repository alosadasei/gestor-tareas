import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Almacenamiento } from '../../lib/almacenamiento';
import {
  esquemaAdjunto,
  esquemaListaAdjuntos,
  esquemaRespuestaSubida,
} from '../../src/api/esquemasRespuesta';
import { DELETE as BORRAR_ADJUNTO } from '../../src/app/api/adjuntos/[id]/route';
import { GET, POST } from '../../src/app/api/tareas/[id]/adjuntos/route';
import { POST as PEDIR_SUBIDA } from '../../src/app/api/tareas/[id]/adjuntos/subida/route';
import { DELETE as BORRAR_TAREA } from '../../src/app/api/tareas/[id]/route';
import { POST as CREAR_TAREA } from '../../src/app/api/tareas/route';
import { urlBdDePrueba } from '../bdDePrueba';
import { conId, peticion, usarBdDePrueba } from './apiDePrueba';

// Almacenamiento falso en memoria: "subir" es guardar el tamaño bajo la clave. La firma real
// de las URLs se prueba en lib/almacenamiento.test.ts.
const almacen = vi.hoisted(() => {
  const ficheros = new Map<string, number>();
  const falso: Almacenamiento & { ficheros: Map<string, number>; fallarAlBorrar: boolean } = {
    ficheros,
    fallarAlBorrar: false,
    async urlSubida(clave, tipoMime) {
      return {
        url: `https://almacen.test/${clave}?firma=x`,
        metodo: 'PUT',
        cabeceras: { 'Content-Type': tipoMime },
        expiraEn: new Date(Date.now() + 300_000),
      };
    },
    async urlDescarga(clave) {
      return `https://almacen.test/${clave}?descarga=x`;
    },
    async tamano(clave) {
      return ficheros.get(clave);
    },
    async borrar(clave) {
      if (falso.fallarAlBorrar) throw new Error('almacenamiento caído');
      ficheros.delete(clave);
    },
  };
  return falso;
});

vi.mock('../../src/api/dependencias', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../src/api/dependencias')>()),
  almacenamiento: () => almacen,
}));

const PDF = { nombreArchivo: 'Informe final.pdf', tipoMime: 'application/pdf', tamanoBytes: 2048 };

describe.skipIf(!urlBdDePrueba)('adjuntos', () => {
  const usuarios = usarBdDePrueba();
  let tareaId: number;

  beforeEach(async () => {
    almacen.ficheros.clear();
    almacen.fallarAlBorrar = false;
    const respuesta = await CREAR_TAREA(
      peticion('POST', '/api/tareas', { titulo: 'T', responsableId: usuarios.ana }),
      {},
    );
    tareaId = (await respuesta.json()).id;
  });

  const pedirSubida = (cuerpo: unknown, id: number = tareaId) =>
    PEDIR_SUBIDA(peticion('POST', `/api/tareas/${id}/adjuntos/subida`, cuerpo), conId(id));
  const registrar = (cuerpo: unknown, id: number = tareaId) =>
    POST(peticion('POST', `/api/tareas/${id}/adjuntos`, cuerpo), conId(id));
  const listar = (id: number = tareaId) =>
    GET(peticion('GET', `/api/tareas/${id}/adjuntos`), conId(id));
  const borrar = (id: number) => BORRAR_ADJUNTO(peticion('DELETE', `/api/adjuntos/${id}`), conId(id));

  // Recorre el flujo completo: pedir URL, "subir" el fichero y registrarlo.
  async function adjuntar(datos = PDF) {
    const { clave } = await (await pedirSubida(datos)).json();
    almacen.ficheros.set(clave, datos.tamanoBytes);
    return (await registrar({ ...datos, clave })).json();
  }

  describe('POST /subida', () => {
    it('devuelve una clave de la tarea y la URL firmada para subir con PUT', async () => {
      const respuesta = await pedirSubida(PDF);
      const cuerpo = await respuesta.json();

      expect(respuesta.status).toBe(200);
      expect(esquemaRespuestaSubida.safeParse(cuerpo).success).toBe(true);
      expect(cuerpo.clave).toMatch(new RegExp(`^tareas/${tareaId}/[0-9a-f-]{36}/Informe_final\\.pdf$`));
      expect(cuerpo.subida).toEqual({
        url: `https://almacen.test/${cuerpo.clave}?firma=x`,
        metodo: 'PUT',
        cabeceras: { 'Content-Type': 'application/pdf' },
        expiraEn: expect.any(String),
      });
    });

    it('responde 400 con tipo no permitido o tamaño excesivo, y 404 sin tarea', async () => {
      expect((await pedirSubida({ ...PDF, tipoMime: 'application/x-msdownload' })).status).toBe(400);
      expect((await pedirSubida({ ...PDF, tamanoBytes: 50 * 1024 * 1024 })).status).toBe(400);
      expect((await pedirSubida(PDF, 9999)).status).toBe(404);
    });
  });

  describe('POST (registrar)', () => {
    it('registra el adjunto subido y responde 201 con su URL de descarga, sin la clave', async () => {
      const { clave } = await (await pedirSubida(PDF)).json();
      almacen.ficheros.set(clave, PDF.tamanoBytes);

      const respuesta = await registrar({ ...PDF, clave });
      expect(respuesta.status).toBe(201);
      const adjunto = await respuesta.json();
      expect(esquemaAdjunto.safeParse(adjunto).success).toBe(true);
      expect(adjunto).toEqual({
        id: expect.any(Number),
        tareaId,
        ...PDF,
        subidoEn: expect.any(String),
        urlDescarga: `https://almacen.test/${clave}?descarga=x`,
      });
    });

    it('responde 400 si el fichero no se llegó a subir o su tamaño no coincide', async () => {
      const { clave } = await (await pedirSubida(PDF)).json();
      expect((await (await registrar({ ...PDF, clave })).json()).error.message).toMatch(/no se ha subido/);

      almacen.ficheros.set(clave, 99);
      expect((await (await registrar({ ...PDF, clave })).json()).error.message).toMatch(/no coincide/);
    });

    it('responde 400 si la clave es de otra tarea', async () => {
      const otra = await (
        await CREAR_TAREA(peticion('POST', '/api/tareas', { titulo: 'Otra', responsableId: usuarios.ana }), {})
      ).json();
      const { clave } = await (await pedirSubida(PDF, otra.id)).json();
      almacen.ficheros.set(clave, PDF.tamanoBytes);

      const respuesta = await registrar({ ...PDF, clave });
      expect(respuesta.status).toBe(400);
      expect((await respuesta.json()).error.details[0].campo).toBe('clave');
    });

    it('responde 409 si se registra dos veces el mismo fichero', async () => {
      const { clave } = await (await pedirSubida(PDF)).json();
      almacen.ficheros.set(clave, PDF.tamanoBytes);
      await registrar({ ...PDF, clave });
      expect((await registrar({ ...PDF, clave })).status).toBe(409);
    });
  });

  describe('GET', () => {
    it('lista los adjuntos de la tarea en orden de subida', async () => {
      await adjuntar();
      await adjuntar({ nombreArchivo: 'captura.png', tipoMime: 'image/png', tamanoBytes: 10 });

      const lista = await (await listar()).json();
      expect(esquemaListaAdjuntos.safeParse(lista).success).toBe(true);
      const { data } = lista;
      expect(data.map((a: { nombreArchivo: string }) => a.nombreArchivo)).toEqual([
        'Informe final.pdf',
        'captura.png',
      ]);
      expect(data[0]).not.toHaveProperty('clave');
    });

    it('responde 404 si la tarea está borrada', async () => {
      await BORRAR_TAREA(peticion('DELETE', `/api/tareas/${tareaId}`), conId(tareaId));
      expect((await listar()).status).toBe(404);
    });
  });

  describe('DELETE /api/adjuntos/:id', () => {
    it('borra el registro y el fichero, y responde 204', async () => {
      const adjunto = await adjuntar();
      expect(almacen.ficheros.size).toBe(1);

      expect((await borrar(adjunto.id)).status).toBe(204);
      expect(almacen.ficheros.size).toBe(0);
      expect((await (await listar()).json()).data).toEqual([]);
      expect((await borrar(adjunto.id)).status).toBe(404);
    });

    it('responde 204 aunque falle el borrado del fichero', async () => {
      const adjunto = await adjuntar();
      almacen.fallarAlBorrar = true;

      expect((await borrar(adjunto.id)).status).toBe(204);
      expect((await (await listar()).json()).data).toEqual([]);
    });

    it('responde 404 si el adjunto es de una tarea borrada', async () => {
      const adjunto = await adjuntar();
      await BORRAR_TAREA(peticion('DELETE', `/api/tareas/${tareaId}`), conId(tareaId));
      expect((await borrar(adjunto.id)).status).toBe(404);
    });
  });
});
