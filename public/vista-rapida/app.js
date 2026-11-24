// Vista rápida: fetch contra la API REST y manipulación directa del DOM, sin frameworks.
// La lógica sin DOM (filtros, queries, fechas) está en logica.js, que tiene sus tests.
import {
  NOMBRES_ESTADO,
  NOMBRES_PRIORIDAD,
  estaVencida,
  formatearFecha,
  leerFiltros,
  mensajeDeError,
  queryDeLaApi,
  queryDeLaPagina,
  resumen,
} from './logica.js';

/** @typedef {import('./logica.js').Tarea} Tarea */

const ESPERA_BUSQUEDA_MS = 300;

/** @template {Element} T @param {string} selector @returns {T} */
const $ = (selector) => /** @type {T} */ (document.querySelector(selector));

/** @type {HTMLFormElement} */ const formulario = $('#filtros');
/** @type {HTMLUListElement} */ const lista = $('#lista');
/** @type {HTMLParagraphElement} */ const textoResumen = $('#resumen');
/** @type {HTMLParagraphElement} */ const aviso = $('#aviso');
/** @type {HTMLDivElement} */ const cajaError = $('#error');
/** @type {HTMLParagraphElement} */ const mensajeError = $('#error-mensaje');
/** @type {HTMLButtonElement} */ const botonReintentar = $('#reintentar');
/** @type {HTMLButtonElement} */ const botonMas = $('#mas');
/** @type {HTMLTemplateElement} */ const plantilla = $('#plantilla-tarea');

let filtros = leerFiltros(location.search);
let paginaActual = 0;
let total = 0;
// Nombres de los responsables por id. Se piden en paralelo con la primera página de tareas.
/** @type {Promise<Map<number, string>>} */
let responsables = Promise.resolve(new Map());
/** @type {AbortController | undefined} */
let cargaEnCurso;
/** @type {() => void} */
let reintentar = () => {};

// ── API ──────────────────────────────────────────────────────────────────────────────────

/**
 * Llama a la API y devuelve el JSON. Si la respuesta es un error, lanza un Error con el
 * mensaje que manda la API ({ error: { message } }).
 * @param {string} ruta
 * @param {RequestInit} [opciones]
 */
async function pedir(ruta, opciones = {}) {
  let respuesta;
  try {
    respuesta = await fetch(`/api${ruta}`, {
      ...opciones,
      headers: { accept: 'application/json', ...(opciones.body ? { 'content-type': 'application/json' } : {}) },
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new Error('No se ha podido conectar con el servidor. Revisa tu conexión.');
  }
  const cuerpo = await respuesta.json().catch(() => null);
  if (!respuesta.ok) throw new Error(mensajeDeError(cuerpo, respuesta.status));
  return cuerpo;
}

// ── Pintar ───────────────────────────────────────────────────────────────────────────────

/**
 * Rellena una tarea clonando la plantilla. Todo con textContent: los datos nunca son HTML.
 * @param {Tarea} tarea @param {Map<number, string>} nombres
 */
function crearElemento(tarea, nombres) {
  const fragmento = /** @type {DocumentFragment} */ (plantilla.content.cloneNode(true));
  const elemento = /** @type {HTMLLIElement} */ (fragmento.querySelector('.tarea'));
  const enlace = /** @type {HTMLAnchorElement} */ (elemento.querySelector('.tarea-titulo a'));
  const insignia = /** @type {HTMLSpanElement} */ (elemento.querySelector('.insignia'));
  const etiqueta = /** @type {HTMLLabelElement} */ (elemento.querySelector('label'));
  const selector = /** @type {HTMLSelectElement} */ (elemento.querySelector('.tarea-estado'));

  enlace.href = `/tareas/${tarea.id}`;
  enlace.textContent = tarea.titulo;
  insignia.dataset.prioridad = tarea.prioridad;
  insignia.textContent = `Prioridad ${NOMBRES_PRIORIDAD[tarea.prioridad].toLowerCase()}`;
  /** @type {HTMLSpanElement} */ (elemento.querySelector('.tarea-responsable')).textContent =
    nombres.get(tarea.responsableId) ?? `Responsable n.º ${tarea.responsableId}`;

  // id único por tarea para asociar la etiqueta al desplegable, y nombre accesible con el
  // título: "Estado de «Preparar la demo»" en vez de diez desplegables llamados "Estado".
  selector.id = `estado-${tarea.id}`;
  etiqueta.htmlFor = selector.id;
  selector.setAttribute('aria-label', `Estado de «${tarea.titulo}»`);
  selector.value = tarea.estado;
  selector.addEventListener('change', () => cambiarEstado(tarea, elemento, selector));

  pintarEstado(tarea, elemento);
  return elemento;
}

/** Lo que depende del estado: el color del borde y si la fecha está vencida. */
/** @param {Tarea} tarea @param {HTMLElement} elemento */
function pintarEstado(tarea, elemento) {
  elemento.dataset.estado = tarea.estado;
  const fecha = /** @type {HTMLSpanElement} */ (elemento.querySelector('.tarea-fecha'));
  const vencida = estaVencida(tarea);
  fecha.classList.toggle('vencida', vencida);
  if (!tarea.fechaLimite) fecha.textContent = 'Sin fecha límite';
  else if (tarea.estado === 'hecha') fecha.textContent = `Fecha límite: ${formatearFecha(tarea.fechaLimite)}`;
  else fecha.textContent = `${vencida ? 'Venció' : 'Vence'} el ${formatearFecha(tarea.fechaLimite)}`;
}

/** @param {string} texto @param {'exito' | 'error'} tipo */
function avisar(texto, tipo) {
  aviso.textContent = texto;
  aviso.dataset.tipo = tipo;
  aviso.hidden = false;
}

/** @param {string} texto @param {() => void} accion */
function mostrarError(texto, accion) {
  mensajeError.textContent = texto;
  reintentar = accion;
  cajaError.hidden = false;
  textoResumen.textContent = '';
}

// ── Acciones ─────────────────────────────────────────────────────────────────────────────

/**
 * Carga la primera página con los filtros actuales o, con `siguiente`, añade la siguiente
 * página al final. Si llega otra carga antes de que termine (p. ej. al seguir escribiendo en
 * el buscador), la anterior se cancela para que una respuesta vieja no pise a la nueva.
 * @param {{ siguiente?: boolean }} [opciones]
 */
async function cargar({ siguiente = false } = {}) {
  cargaEnCurso?.abort();
  const control = new AbortController();
  cargaEnCurso = control;

  const pagina = siguiente ? paginaActual + 1 : 1;
  cajaError.hidden = true;
  botonMas.disabled = true;
  lista.setAttribute('aria-busy', 'true');
  if (!siguiente) textoResumen.textContent = 'Cargando tareas…';

  try {
    const { data, meta } = await pedir(`/tareas?${queryDeLaApi(filtros, pagina)}`, { signal: control.signal });
    const nombres = await responsables;
    const nuevas = data.map((/** @type {Tarea} */ tarea) => crearElemento(tarea, nombres));
    if (siguiente) lista.append(...nuevas);
    else lista.replaceChildren(...nuevas);

    paginaActual = meta.pagina;
    total = meta.total;
    textoResumen.textContent = resumen(lista.children.length, total);
    botonMas.hidden = lista.children.length >= total;
    // Con teclado, tras «Cargar más» el foco pasa a la primera tarea nueva para seguir leyendo
    // desde ahí (el botón puede desaparecer si ya no quedan más).
    if (siguiente) nuevas[0]?.querySelector('a')?.focus();
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return;
    mostrarError(/** @type {Error} */ (error).message, () => cargar({ siguiente }));
  } finally {
    if (cargaEnCurso === control) {
      lista.removeAttribute('aria-busy');
      botonMas.disabled = false;
    }
  }
}

/**
 * Cambia el estado en la API. Si falla, el desplegable vuelve a su valor y se avisa.
 * @param {Tarea} tarea @param {HTMLElement} elemento @param {HTMLSelectElement} selector
 */
async function cambiarEstado(tarea, elemento, selector) {
  const anterior = tarea.estado;
  const nuevo = /** @type {Tarea['estado']} */ (selector.value);
  selector.disabled = true;
  try {
    await pedir(`/tareas/${tarea.id}/estado`, { method: 'PATCH', body: JSON.stringify({ estado: nuevo }) });
    tarea.estado = nuevo;
    pintarEstado(tarea, elemento);
    avisar(`«${tarea.titulo}» movida a ${NOMBRES_ESTADO[nuevo]}.`, 'exito');
  } catch (error) {
    selector.value = anterior;
    avisar(`No se ha podido cambiar el estado de «${tarea.titulo}». ${/** @type {Error} */ (error).message}`, 'error');
  } finally {
    selector.disabled = false;
    // Al deshabilitarlo, el navegador le quita el foco: se le devuelve para seguir con teclado.
    selector.focus();
  }
}

// ── Filtros ──────────────────────────────────────────────────────────────────────────────

function pintarFiltros() {
  for (const [nombre, valor] of Object.entries(filtros)) {
    const campo = /** @type {HTMLInputElement | HTMLSelectElement} */ (formulario.elements.namedItem(nombre));
    campo.value = valor;
  }
}

/** Lee el formulario, guarda los filtros en la URL (para compartirla) y recarga. */
function aplicarFiltros() {
  filtros = leerFiltros(new URLSearchParams(/** @type {any} */ (new FormData(formulario))).toString());
  history.replaceState(null, '', `${location.pathname}${queryDeLaPagina(filtros)}`);
  cargar();
}

/** @type {ReturnType<typeof setTimeout> | undefined} */
let esperaBusqueda;

// El buscador espera a que se deje de escribir; los desplegables aplican al momento.
formulario.addEventListener('input', (evento) => {
  clearTimeout(esperaBusqueda);
  if (/** @type {HTMLElement} */ (evento.target).id === 'filtro-texto') {
    esperaBusqueda = setTimeout(aplicarFiltros, ESPERA_BUSQUEDA_MS);
  } else {
    aplicarFiltros();
  }
});
formulario.addEventListener('submit', (evento) => {
  evento.preventDefault();
  clearTimeout(esperaBusqueda);
  aplicarFiltros();
});
// El evento reset llega antes de que el navegador vacíe los campos: se aplica justo después.
formulario.addEventListener('reset', () => {
  clearTimeout(esperaBusqueda);
  setTimeout(aplicarFiltros);
});

botonMas.addEventListener('click', () => cargar({ siguiente: true }));
botonReintentar.addEventListener('click', () => reintentar());

// ── Inicio ───────────────────────────────────────────────────────────────────────────────

pintarFiltros();
// Los nombres de los responsables no son imprescindibles: si fallan, se muestra el id.
responsables = pedir('/usuarios').then(
  ({ data }) => new Map(data.map((/** @type {{ id: number, nombre: string }} */ u) => [u.id, u.nombre])),
  () => new Map(),
);
cargar();
