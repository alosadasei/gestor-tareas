// Lógica pura de la vista rápida: sin DOM ni fetch, para poder probarla con Vitest.
// Es JavaScript del navegador tal cual (módulo ES, sin compilar); los tipos van en JSDoc.

/** @typedef {'pendiente' | 'en-curso' | 'hecha'} Estado */
/** @typedef {'baja' | 'media' | 'alta'} Prioridad */
/**
 * @typedef {{ id: number, titulo: string, estado: Estado, prioridad: Prioridad,
 *   responsableId: number, etiquetas: string[], fechaLimite?: string }} Tarea
 */
/** @typedef {{ texto: string, estado: string, prioridad: string, orden: string }} Filtros */

export const TAMANO_PAGINA = 10;

/** @type {Record<Estado, string>} */
export const NOMBRES_ESTADO = { pendiente: 'Pendiente', 'en-curso': 'En curso', hecha: 'Hecha' };

/** @type {Record<Prioridad, string>} */
export const NOMBRES_PRIORIDAD = { baja: 'Baja', media: 'Media', alta: 'Alta' };

// Cada opción de orden del desplegable corresponde a un ordenarPor + direccion de la API.
/** @type {Record<string, { ordenarPor: string, direccion: 'asc' | 'desc' }>} */
export const ORDENES = {
  recientes: { ordenarPor: 'id', direccion: 'desc' },
  'fecha-limite': { ordenarPor: 'fechaLimite', direccion: 'asc' },
  prioridad: { ordenarPor: 'prioridad', direccion: 'desc' },
};

/** @type {Filtros} */
export const FILTROS_INICIALES = { texto: '', estado: '', prioridad: '', orden: 'recientes' };

/**
 * Lee los filtros de la query de la página (?estado=hecha&texto=api), descartando los valores
 * que no existen: la URL se puede editar a mano o venir de un enlace viejo.
 * @param {string} query
 * @returns {Filtros}
 */
export function leerFiltros(query) {
  const params = new URLSearchParams(query);
  const valido = (/** @type {string} */ clave, /** @type {object} */ permitidos) => {
    const valor = params.get(clave) ?? '';
    return Object.hasOwn(permitidos, valor) ? valor : '';
  };
  return {
    texto: (params.get('texto') ?? '').trim().slice(0, 100),
    estado: valido('estado', NOMBRES_ESTADO),
    prioridad: valido('prioridad', NOMBRES_PRIORIDAD),
    orden: valido('orden', ORDENES) || FILTROS_INICIALES.orden,
  };
}

/**
 * Query de la página con los filtros activos (sin los valores por defecto), para que la URL
 * se pueda compartir o guardar como marcador.
 * @param {Filtros} filtros
 */
export function queryDeLaPagina(filtros) {
  const params = new URLSearchParams();
  if (filtros.texto) params.set('texto', filtros.texto);
  if (filtros.estado) params.set('estado', filtros.estado);
  if (filtros.prioridad) params.set('prioridad', filtros.prioridad);
  if (filtros.orden !== FILTROS_INICIALES.orden) params.set('orden', filtros.orden);
  const query = params.toString();
  return query ? `?${query}` : '';
}

/**
 * Query de GET /api/tareas para una página de resultados.
 * @param {Filtros} filtros
 * @param {number} pagina
 */
export function queryDeLaApi(filtros, pagina) {
  const { ordenarPor, direccion } = ORDENES[filtros.orden] ?? ORDENES[FILTROS_INICIALES.orden];
  const params = new URLSearchParams({
    pagina: String(pagina),
    tamanoPagina: String(TAMANO_PAGINA),
    ordenarPor,
    direccion,
  });
  if (filtros.texto) params.set('texto', filtros.texto);
  if (filtros.estado) params.set('estado', filtros.estado);
  if (filtros.prioridad) params.set('prioridad', filtros.prioridad);
  return params.toString();
}

/**
 * Texto del resumen que se anuncia tras cada carga.
 * @param {number} mostradas
 * @param {number} total
 */
export function resumen(mostradas, total) {
  if (total === 0) return 'Ninguna tarea coincide con los filtros.';
  if (mostradas >= total) return total === 1 ? '1 tarea.' : `${total} tareas.`;
  return `Mostrando ${mostradas} de ${total} tareas.`;
}

// Las fechas límite se guardan como medianoche UTC del día elegido: se muestran en UTC para
// que no "cambien de día" según la zona horaria de quien mira (igual que en el tablero).
const formatoFecha = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', timeZone: 'UTC' });

/** @param {string} iso */
export function formatearFecha(iso) {
  return formatoFecha.format(new Date(iso));
}

/** "AAAA-MM-DD" del día de hoy en la zona de quien mira. @param {Date} ahora */
const hoyIso = (ahora) =>
  [ahora.getFullYear(), ahora.getMonth() + 1, ahora.getDate()].map((n) => String(n).padStart(2, '0')).join('-');

/**
 * Una tarea está vencida si su día límite ya pasó (hoy todavía no) y no está hecha.
 * @param {Pick<Tarea, 'estado' | 'fechaLimite'>} tarea
 * @param {Date} [ahora]
 */
export function estaVencida(tarea, ahora = new Date()) {
  if (!tarea.fechaLimite || tarea.estado === 'hecha') return false;
  return tarea.fechaLimite.slice(0, 10) < hoyIso(ahora);
}

/**
 * Mensaje legible de una respuesta de error de la API ({ error: { message } }).
 * @param {unknown} cuerpo
 * @param {number} estadoHttp
 */
export function mensajeDeError(cuerpo, estadoHttp) {
  const mensaje = /** @type {{ error?: { message?: unknown } }} */ (cuerpo)?.error?.message;
  return typeof mensaje === 'string' ? mensaje : `Error inesperado del servidor (${estadoHttp}).`;
}
