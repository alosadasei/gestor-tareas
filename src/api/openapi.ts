import { z } from 'zod';
import {
  esquemaCambiarEstado,
  esquemaCrearComentario,
  esquemaCrearTarea,
  esquemaEditarTarea,
  esquemaListadoTareas,
  esquemaRegistrarAdjunto,
  esquemaSolicitudSubida,
} from './esquemas';
import {
  esquemaAdjunto,
  esquemaComentario,
  esquemaError,
  esquemaEstadisticas,
  esquemaListaAdjuntos,
  esquemaListaComentarios,
  esquemaListaEtiquetas,
  esquemaListaUsuarios,
  esquemaPaginaTareas,
  esquemaRespuestaSubida,
  esquemaSalud,
  esquemaTarea,
} from './esquemasRespuesta';

// Documento OpenAPI 3.1 generado a partir de los mismos esquemas Zod que validan la API:
// si cambia una validación, cambia la documentación. Las rutas y sus respuestas se
// describen aquí a mano (Next no tiene un registro de rutas del que sacarlas); un test
// comprueba que cada ruta implementada está documentada y viceversa.

type Json = Record<string, unknown>;

// Componentes con nombre: en el documento aparecen como #/components/schemas/<nombre>.
const COMPONENTES = {
  Tarea: esquemaTarea,
  PaginaTareas: esquemaPaginaTareas,
  CrearTarea: esquemaCrearTarea,
  EditarTarea: esquemaEditarTarea,
  CambiarEstado: esquemaCambiarEstado,
  Comentario: esquemaComentario,
  ListaComentarios: esquemaListaComentarios,
  CrearComentario: esquemaCrearComentario,
  Adjunto: esquemaAdjunto,
  ListaAdjuntos: esquemaListaAdjuntos,
  SolicitudSubida: esquemaSolicitudSubida,
  RespuestaSubida: esquemaRespuestaSubida,
  RegistrarAdjunto: esquemaRegistrarAdjunto,
  ListaUsuarios: esquemaListaUsuarios,
  ListaEtiquetas: esquemaListaEtiquetas,
  Estadisticas: esquemaEstadisticas,
  Salud: esquemaSalud,
  Error: esquemaError,
} satisfies Record<string, z.ZodType>;

type NombreComponente = keyof typeof COMPONENTES;

const ref = (nombre: NombreComponente) => ({ $ref: `#/components/schemas/${nombre}` });

function esquemasComponentes(): Record<string, Json> {
  const registro = z.registry<{ id: string }>();
  for (const [id, esquema] of Object.entries(COMPONENTES)) registro.add(esquema, { id });
  // io: 'input' describe lo que la API acepta (antes de transformaciones como texto → Date).
  const { schemas } = z.toJSONSchema(registro, {
    io: 'input',
    uri: (id) => `#/components/schemas/${id}`,
  });
  // $schema e $id sobran dentro de un documento OpenAPI.
  return Object.fromEntries(
    Object.entries(schemas).map(([id, { $schema: _s, $id: _i, ...esquema }]) => [id, esquema]),
  );
}

// Los query params del listado salen de las propiedades de su esquema Zod.
function parametrosListado(): Json[] {
  const { properties = {}, required = [] } = z.toJSONSchema(esquemaListadoTareas, { io: 'input' });
  return Object.entries(properties).map(([nombre, esquema]) => ({
    name: nombre,
    in: 'query',
    required: required.includes(nombre),
    schema: esquema,
  }));
}

const parametroId = (recurso: string): Json => ({
  name: 'id',
  in: 'path',
  required: true,
  description: `Id de ${recurso}`,
  schema: { type: 'integer', minimum: 1 },
});

const json = (descripcion: string, nombre: NombreComponente): Json => ({
  description: descripcion,
  content: { 'application/json': { schema: ref(nombre) } },
});

const cuerpo = (nombre: NombreComponente): Json => ({
  required: true,
  content: { 'application/json': { schema: ref(nombre) } },
});

const error = (codigo: '400' | '404' | '409') =>
  ({ 400: { $ref: '#/components/responses/Validacion' }, 404: { $ref: '#/components/responses/NoEncontrado' }, 409: { $ref: '#/components/responses/Conflicto' } })[codigo];

const sinContenido = { description: 'Hecho, sin contenido' };

function operacion(datos: {
  etiqueta: string;
  resumen: string;
  descripcion?: string;
  parametros?: Json[];
  cuerpo?: Json;
  respuestas: Record<string, Json>;
}): Json {
  return {
    tags: [datos.etiqueta],
    summary: datos.resumen,
    ...(datos.descripcion && { description: datos.descripcion }),
    ...(datos.parametros && { parameters: datos.parametros }),
    ...(datos.cuerpo && { requestBody: datos.cuerpo }),
    responses: { ...datos.respuestas, 500: { $ref: '#/components/responses/ErrorInterno' } },
  };
}

function rutas(): Json {
  const idTarea = parametroId('la tarea');
  return {
    '/api/tareas': {
      get: operacion({
        etiqueta: 'Tareas',
        resumen: 'Listar tareas',
        descripcion: 'Con paginación, filtros y ordenación. No incluye las tareas borradas.',
        parametros: parametrosListado(),
        respuestas: { 200: json('Página de tareas', 'PaginaTareas'), 400: error('400') },
      }),
      post: operacion({
        etiqueta: 'Tareas',
        resumen: 'Crear una tarea',
        descripcion: 'Se crea en estado pendiente. La cabecera Location apunta a la tarea creada.',
        cuerpo: cuerpo('CrearTarea'),
        respuestas: { 201: json('Tarea creada', 'Tarea'), 400: error('400') },
      }),
    },
    '/api/tareas/{id}': {
      parameters: [idTarea],
      get: operacion({
        etiqueta: 'Tareas',
        resumen: 'Obtener una tarea',
        respuestas: { 200: json('La tarea', 'Tarea'), 400: error('400'), 404: error('404') },
      }),
      patch: operacion({
        etiqueta: 'Tareas',
        resumen: 'Editar una tarea',
        descripcion: 'Solo cambian los campos enviados. fechaLimite: null quita la fecha. El estado se cambia en /estado.',
        cuerpo: cuerpo('EditarTarea'),
        respuestas: { 200: json('Tarea editada', 'Tarea'), 400: error('400'), 404: error('404') },
      }),
      delete: operacion({
        etiqueta: 'Tareas',
        resumen: 'Borrar una tarea',
        descripcion: 'Borrado lógico: la tarea deja de verse, pero se conservan su historial y auditoría.',
        respuestas: { 204: sinContenido, 400: error('400'), 404: error('404') },
      }),
    },
    '/api/tareas/{id}/estado': {
      parameters: [idTarea],
      patch: operacion({
        etiqueta: 'Tareas',
        resumen: 'Cambiar el estado (mover de columna)',
        cuerpo: cuerpo('CambiarEstado'),
        respuestas: { 200: json('Tarea con el nuevo estado', 'Tarea'), 400: error('400'), 404: error('404') },
      }),
    },
    '/api/tareas/{id}/comentarios': {
      parameters: [idTarea],
      get: operacion({
        etiqueta: 'Comentarios',
        resumen: 'Listar los comentarios de una tarea',
        descripcion: 'Del más antiguo al más reciente, con su autor.',
        respuestas: { 200: json('Comentarios', 'ListaComentarios'), 400: error('400'), 404: error('404') },
      }),
      post: operacion({
        etiqueta: 'Comentarios',
        resumen: 'Comentar una tarea',
        cuerpo: cuerpo('CrearComentario'),
        respuestas: { 201: json('Comentario creado', 'Comentario'), 400: error('400'), 404: error('404') },
      }),
    },
    '/api/tareas/{id}/adjuntos/subida': {
      parameters: [idTarea],
      post: operacion({
        etiqueta: 'Adjuntos',
        resumen: 'Paso 1: pedir una URL firmada para subir un archivo',
        descripcion:
          'Devuelve una URL a la que subir el archivo con PUT, enviando las cabeceras indicadas, y la clave con la que registrarlo después. Caduca a los 5 minutos.',
        cuerpo: cuerpo('SolicitudSubida'),
        respuestas: { 200: json('URL de subida', 'RespuestaSubida'), 400: error('400'), 404: error('404') },
      }),
    },
    '/api/tareas/{id}/adjuntos': {
      parameters: [idTarea],
      get: operacion({
        etiqueta: 'Adjuntos',
        resumen: 'Listar los adjuntos de una tarea',
        descripcion: 'Cada adjunto incluye una URL de descarga firmada que caduca a los 10 minutos.',
        respuestas: { 200: json('Adjuntos', 'ListaAdjuntos'), 400: error('400'), 404: error('404') },
      }),
      post: operacion({
        etiqueta: 'Adjuntos',
        resumen: 'Paso 2: registrar el archivo ya subido',
        descripcion: 'Comprueba que el archivo existe en el almacenamiento y que su tamaño es el declarado.',
        cuerpo: cuerpo('RegistrarAdjunto'),
        respuestas: {
          201: json('Adjunto registrado', 'Adjunto'),
          400: error('400'),
          404: error('404'),
          409: error('409'),
        },
      }),
    },
    '/api/adjuntos/{id}': {
      parameters: [parametroId('el adjunto')],
      delete: operacion({
        etiqueta: 'Adjuntos',
        resumen: 'Borrar un adjunto',
        descripcion: 'Borra el registro y el archivo del almacenamiento.',
        respuestas: { 204: sinContenido, 400: error('400'), 404: error('404') },
      }),
    },
    '/api/usuarios': {
      get: operacion({
        etiqueta: 'Catálogos',
        resumen: 'Listar usuarios',
        respuestas: { 200: json('Usuarios', 'ListaUsuarios') },
      }),
    },
    '/api/etiquetas': {
      get: operacion({
        etiqueta: 'Catálogos',
        resumen: 'Listar etiquetas',
        descripcion: 'Con el número de tareas (no borradas) que usan cada una.',
        respuestas: { 200: json('Etiquetas', 'ListaEtiquetas') },
      }),
    },
    '/api/estadisticas': {
      get: operacion({
        etiqueta: 'Estadísticas',
        resumen: 'Resumen del tablero',
        descripcion:
          'Servido con caché cache-aside (Redis, 60 s). La cabecera X-Cache indica HIT, MISS o BYPASS.',
        respuestas: {
          200: {
            ...json('Estadísticas', 'Estadisticas'),
            headers: { 'X-Cache': { schema: { type: 'string', enum: ['HIT', 'MISS', 'BYPASS'] } } },
          },
        },
      }),
    },
    '/api/health': {
      get: operacion({
        etiqueta: 'Operación',
        resumen: 'Health check',
        respuestas: {
          200: json('La app y la base de datos responden', 'Salud'),
          503: json('La base de datos no responde', 'Salud'),
        },
      }),
    },
  };
}

const respuestaError = (descripcion: string): Json => ({
  description: descripcion,
  content: { 'application/json': { schema: ref('Error') } },
});

export function generarDocumentoOpenApi(): Json {
  return {
    openapi: '3.1.0',
    info: {
      title: 'Gestor de Tareas API',
      version: '1.0.0',
      description:
        'API REST del Gestor de Tareas. Todas las respuestas llevan la cabecera X-Request-Id, que también aparece en los errores y en los logs del servidor.',
    },
    servers: [{ url: '/' }],
    tags: [
      { name: 'Tareas' },
      { name: 'Comentarios' },
      { name: 'Adjuntos' },
      { name: 'Catálogos' },
      { name: 'Estadísticas' },
      { name: 'Operación' },
    ],
    paths: rutas(),
    components: {
      schemas: esquemasComponentes(),
      responses: {
        Validacion: respuestaError('Datos de entrada no válidos (code VALIDACION), con un detalle por campo'),
        NoEncontrado: respuestaError('El recurso no existe (code NO_ENCONTRADO)'),
        Conflicto: respuestaError('Conflicto con el estado actual (code CONFLICTO)'),
        ErrorInterno: respuestaError('Error técnico (code ERROR_INTERNO), sin detalles internos'),
      },
    },
  };
}
