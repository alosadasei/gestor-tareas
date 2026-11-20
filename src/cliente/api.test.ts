import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { adjuntarArchivo, api, ErrorApi, subirArchivo } from './api';

const fetchFalso = vi.fn<typeof fetch>();

const json = (cuerpo: unknown, estado = 200) =>
  new Response(JSON.stringify(cuerpo), { status: estado, headers: { 'Content-Type': 'application/json' } });

// URL, método, cabeceras y cuerpo de la llamada n-ésima a fetch.
function llamada(n = 0) {
  const [url, opciones = {}] = fetchFalso.mock.calls[n];
  return {
    url: String(url),
    metodo: opciones.method,
    cabeceras: opciones.headers,
    cuerpo: typeof opciones.body === 'string' ? JSON.parse(opciones.body) : opciones.body,
  };
}

describe('cliente de la API', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', fetchFalso);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    fetchFalso.mockReset();
  });

  it('construye la query del listado sin los parámetros vacíos', async () => {
    fetchFalso.mockResolvedValueOnce(json({ data: [], meta: {} }));
    await api.listarTareas({ estado: 'en-curso', pagina: 2, texto: '', responsableId: undefined });
    expect(llamada()).toMatchObject({ url: '/api/tareas?estado=en-curso&pagina=2', metodo: 'GET' });
  });

  it('envía el cuerpo como JSON con su cabecera', async () => {
    fetchFalso.mockResolvedValueOnce(json({ id: 1 }, 201));
    const tarea = await api.crearTarea({ titulo: 'T', responsableId: 1 });

    expect(tarea).toEqual({ id: 1 });
    expect(llamada()).toEqual({
      url: '/api/tareas',
      metodo: 'POST',
      cabeceras: { 'Content-Type': 'application/json' },
      cuerpo: { titulo: 'T', responsableId: 1 },
    });
  });

  it('cambia el estado con PATCH en su recurso', async () => {
    fetchFalso.mockResolvedValueOnce(json({ id: 3, estado: 'hecha' }));
    await api.cambiarEstado(3, 'hecha');
    expect(llamada()).toMatchObject({ url: '/api/tareas/3/estado', metodo: 'PATCH', cuerpo: { estado: 'hecha' } });
  });

  it('devuelve undefined en las respuestas 204', async () => {
    fetchFalso.mockResolvedValueOnce(new Response(null, { status: 204 }));
    await expect(api.borrarTarea(3)).resolves.toBeUndefined();
    expect(llamada()).toMatchObject({ url: '/api/tareas/3', metodo: 'DELETE' });
  });

  it('desenvuelve el campo data de las listas', async () => {
    fetchFalso.mockResolvedValueOnce(json({ data: [{ id: 1, nombre: 'Ana', email: 'a@b.c' }] }));
    expect(await api.listarUsuarios()).toEqual([{ id: 1, nombre: 'Ana', email: 'a@b.c' }]);
  });

  it('convierte el error de la API en un ErrorApi con código, detalles y requestId', async () => {
    fetchFalso.mockResolvedValueOnce(
      json(
        {
          error: {
            code: 'VALIDACION',
            message: 'Los datos enviados no son válidos',
            details: [{ campo: 'titulo', mensaje: 'Demasiado largo' }],
            requestId: 'req-1',
          },
        },
        400,
      ),
    );

    const error = await api.crearTarea({ titulo: 'x', responsableId: 1 }).catch((e) => e);
    expect(error).toBeInstanceOf(ErrorApi);
    expect(error).toMatchObject({ estado: 400, codigo: 'VALIDACION', requestId: 'req-1' });
    expect(error.errorDeCampo('titulo')).toBe('Demasiado largo');
    expect(error.errorDeCampo('prioridad')).toBeUndefined();
  });

  it('distingue la falta de conexión y una respuesta de error sin el formato común', async () => {
    fetchFalso.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    await expect(api.obtenerTarea(1)).rejects.toMatchObject({ codigo: 'SIN_CONEXION', estado: 0 });

    fetchFalso.mockResolvedValueOnce(new Response('<html>502</html>', { status: 502 }));
    await expect(api.obtenerTarea(1)).rejects.toMatchObject({ codigo: 'RESPUESTA_INESPERADA', estado: 502 });
  });

  describe('adjuntos', () => {
    const subida = {
      url: 'https://almacen.test/tareas/1/u/a.pdf?firma=x',
      metodo: 'PUT' as const,
      cabeceras: { 'Content-Type': 'application/pdf' },
      expiraEn: '2026-11-20T10:05:00.000Z',
    };

    it('sube el archivo a la URL firmada con las cabeceras de la firma', async () => {
      fetchFalso.mockResolvedValueOnce(new Response(null, { status: 200 }));
      const archivo = new Blob(['hola'], { type: 'application/pdf' });
      await subirArchivo(subida, archivo);
      expect(llamada()).toEqual({ url: subida.url, metodo: 'PUT', cabeceras: subida.cabeceras, cuerpo: archivo });
    });

    it('avisa si el almacenamiento rechaza la subida', async () => {
      fetchFalso.mockResolvedValueOnce(new Response('SignatureDoesNotMatch', { status: 403 }));
      await expect(subirArchivo(subida, new Blob(['x']))).rejects.toMatchObject({ estado: 403 });
    });

    it('adjuntarArchivo pide la URL, sube y registra con la clave recibida', async () => {
      fetchFalso
        .mockResolvedValueOnce(json({ clave: 'tareas/1/u/a.pdf', subida }))
        .mockResolvedValueOnce(new Response(null, { status: 200 }))
        .mockResolvedValueOnce(json({ id: 9 }, 201));
      const archivo = new File(['hola'], 'a.pdf', { type: 'application/pdf' });

      expect(await adjuntarArchivo(1, archivo)).toEqual({ id: 9 });
      const declarado = { nombreArchivo: 'a.pdf', tipoMime: 'application/pdf', tamanoBytes: 4 };
      expect(llamada(0)).toMatchObject({ url: '/api/tareas/1/adjuntos/subida', cuerpo: declarado });
      expect(llamada(1)).toMatchObject({ url: subida.url, metodo: 'PUT' });
      expect(llamada(2)).toMatchObject({
        url: '/api/tareas/1/adjuntos',
        cuerpo: { ...declarado, clave: 'tareas/1/u/a.pdf' },
      });
    });

    it('si la subida falla no registra el adjunto', async () => {
      fetchFalso
        .mockResolvedValueOnce(json({ clave: 'k', subida }))
        .mockResolvedValueOnce(new Response(null, { status: 403 }));
      await expect(adjuntarArchivo(1, new File(['x'], 'a.pdf', { type: 'application/pdf' }))).rejects.toBeInstanceOf(
        ErrorApi,
      );
      expect(fetchFalso).toHaveBeenCalledTimes(2);
    });
  });
});
