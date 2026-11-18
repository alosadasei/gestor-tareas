import { beforeEach, describe, expect, it } from 'vitest';
import { GET, POST } from '../../src/app/api/tareas/route';
import { urlBdDePrueba } from '../bdDePrueba';
import { peticion, usarBdDePrueba } from './apiDePrueba';

const DIA_MS = 24 * 60 * 60 * 1000;
const enDias = (dias: number) => new Date(Date.now() + dias * DIA_MS).toISOString();

describe.skipIf(!urlBdDePrueba)('/api/tareas', () => {
  const usuarios = usarBdDePrueba();

  const crear = (cuerpo: unknown) => POST(peticion('POST', '/api/tareas', cuerpo), {});
  const listar = async (query = '') => {
    const respuesta = await GET(peticion('GET', `/api/tareas${query}`), {});
    return { estado: respuesta.status, cuerpo: await respuesta.json() };
  };

  describe('POST', () => {
    it('crea la tarea y responde 201 con la tarea y su Location', async () => {
      const fechaLimite = enDias(3);
      const respuesta = await crear({
        titulo: 'Preparar la demo',
        prioridad: 'alta',
        fechaLimite,
        responsableId: usuarios.ana,
        etiquetas: ['demo'],
      });
      const tarea = await respuesta.json();

      expect(respuesta.status).toBe(201);
      expect(respuesta.headers.get('Location')).toBe(`/api/tareas/${tarea.id}`);
      expect(respuesta.headers.get('x-request-id')).toBeTruthy();
      expect(tarea).toEqual({
        id: expect.any(Number),
        titulo: 'Preparar la demo',
        descripcion: '',
        estado: 'pendiente',
        prioridad: 'alta',
        fechaLimite,
        responsableId: usuarios.ana,
        etiquetas: ['demo'],
      });
    });

    it('responde 400 con un detalle por campo si la entrada no es válida', async () => {
      const respuesta = await crear({ titulo: 'T', prioridad: 'urgente' });
      const { error } = await respuesta.json();

      expect(respuesta.status).toBe(400);
      expect(error.code).toBe('VALIDACION');
      expect(error.details.map((d: { campo: string }) => d.campo)).toEqual([
        'prioridad',
        'responsableId',
      ]);
    });

    it('responde 400 si el cuerpo no es JSON', async () => {
      const respuesta = await crear('{titulo:');
      expect(respuesta.status).toBe(400);
      expect((await respuesta.json()).error.message).toMatch(/JSON/);
    });

    it('responde 400 con las reglas del dominio: título vacío o fecha pasada', async () => {
      const vacio = await crear({ titulo: '   ', responsableId: usuarios.ana });
      expect(vacio.status).toBe(400);
      expect((await vacio.json()).error.message).toMatch(/título/);

      const pasada = await crear({ titulo: 'T', responsableId: usuarios.ana, fechaLimite: enDias(-2) });
      expect(pasada.status).toBe(400);
      expect((await pasada.json()).error.message).toMatch(/anterior a hoy/);
    });

    it('responde 400 si el responsable no existe (clave foránea)', async () => {
      const respuesta = await crear({ titulo: 'T', responsableId: 9999 });
      expect(respuesta.status).toBe(400);
      expect((await respuesta.json()).error.code).toBe('VALIDACION');
    });
  });

  describe('GET', () => {
    beforeEach(async () => {
      await crear({ titulo: 'Diseñar login', prioridad: 'baja', responsableId: usuarios.ana, fechaLimite: enDias(5) });
      await crear({ titulo: 'API de tareas', prioridad: 'alta', responsableId: usuarios.bruno });
      await crear({ titulo: 'Revisar LOGIN', prioridad: 'media', responsableId: usuarios.ana, fechaLimite: enDias(1) });
    });

    it('lista con paginación y metadatos', async () => {
      const { estado, cuerpo } = await listar('?tamanoPagina=2');
      expect(estado).toBe(200);
      expect(cuerpo.data.map((t: { titulo: string }) => t.titulo)).toEqual(['Diseñar login', 'API de tareas']);
      expect(cuerpo.meta).toEqual({ pagina: 1, tamanoPagina: 2, total: 3, totalPaginas: 2 });

      const segunda = await listar('?tamanoPagina=2&pagina=2');
      expect(segunda.cuerpo.data).toHaveLength(1);
    });

    it('filtra por responsable, prioridad y texto', async () => {
      const titulos = async (query: string) =>
        (await listar(query)).cuerpo.data.map((t: { titulo: string }) => t.titulo);

      expect(await titulos(`?responsableId=${usuarios.bruno}`)).toEqual(['API de tareas']);
      expect(await titulos('?prioridad=media')).toEqual(['Revisar LOGIN']);
      expect(await titulos('?texto=login')).toEqual(['Diseñar login', 'Revisar LOGIN']);
    });

    it('ordena por el campo y la dirección indicados', async () => {
      const { cuerpo } = await listar('?ordenarPor=prioridad&direccion=desc');
      expect(cuerpo.data.map((t: { prioridad: string }) => t.prioridad)).toEqual(['alta', 'media', 'baja']);
    });

    it('responde 400 si un query param no es válido', async () => {
      const { estado, cuerpo } = await listar('?tamanoPagina=500&estado=archivada');
      expect(estado).toBe(400);
      expect(cuerpo.error.details.map((d: { campo: string }) => d.campo)).toEqual(['tamanoPagina', 'estado']);
    });
  });
});
