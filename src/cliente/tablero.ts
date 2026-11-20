import { esquemaCrearTarea, esquemaEditarTarea } from '../api/esquemas';
import type { CambiosTarea, EstadoTarea, NuevaTarea, Tarea } from './api';

// Lógica del tablero sin React: se prueba con tests unitarios y los componentes solo la usan.

export const ESTADOS: { clave: EstadoTarea; nombre: string }[] = [
  { clave: 'pendiente', nombre: 'Pendiente' },
  { clave: 'en-curso', nombre: 'En curso' },
  { clave: 'hecha', nombre: 'Hecha' },
];

export const NOMBRE_ESTADO = Object.fromEntries(ESTADOS.map((e) => [e.clave, e.nombre])) as Record<
  EstadoTarea,
  string
>;

export const NOMBRE_PRIORIDAD = { baja: 'Baja', media: 'Media', alta: 'Alta' } as const;

// Las fechas límite se guardan como medianoche UTC del día elegido: se muestran en UTC para
// que no "cambie de día" según la zona horaria de quien mira.
const formatoFecha = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', timeZone: 'UTC' });

export function formatearFecha(iso: string): string {
  return formatoFecha.format(new Date(iso));
}

// "AAAA-MM-DD" de hoy en la zona del usuario (lo que espera un <input type="date">).
export function hoyIso(ahora = new Date()): string {
  const local = new Date(ahora.getTime() - ahora.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

export function estaVencida(tarea: Pick<Tarea, 'estado' | 'fechaLimite'>, ahora = new Date()): boolean {
  if (!tarea.fechaLimite || tarea.estado === 'hecha') return false;
  return tarea.fechaLimite.slice(0, 10) < hoyIso(ahora);
}

export function iniciales(nombre: string): string {
  return nombre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0].toUpperCase())
    .join('');
}

export function cambiarEstadoEnLista(tareas: Tarea[], id: number, estado: EstadoTarea): Tarea[] {
  return tareas.map((t) => (t.id === id ? { ...t, estado } : t));
}

export function reemplazarEnLista(tareas: Tarea[], tarea: Tarea): Tarea[] {
  return tareas.map((t) => (t.id === tarea.id ? tarea : t));
}

export function porcentajeHechas(tareas: Pick<Tarea, 'estado'>[]): number {
  if (tareas.length === 0) return 0;
  return Math.round((tareas.filter((t) => t.estado === 'hecha').length / tareas.length) * 100);
}

// ---- Formulario de tarea ----

// Valores tal como están en los inputs (todo texto).
export type ValoresFormulario = {
  titulo: string;
  descripcion: string;
  prioridad: NonNullable<NuevaTarea['prioridad']>;
  fechaLimite: string; // "AAAA-MM-DD" o '' si no tiene
  responsableId: string;
  etiquetas: string; // separadas por comas
};

export type ErroresFormulario = Partial<Record<keyof ValoresFormulario | 'general', string>>;

export function valoresIniciales(tarea: Tarea | undefined, responsablePorDefecto?: number): ValoresFormulario {
  return {
    titulo: tarea?.titulo ?? '',
    descripcion: tarea?.descripcion ?? '',
    prioridad: tarea?.prioridad ?? 'media',
    fechaLimite: tarea?.fechaLimite?.slice(0, 10) ?? '',
    responsableId: String(tarea?.responsableId ?? responsablePorDefecto ?? ''),
    etiquetas: tarea?.etiquetas.join(', ') ?? '',
  };
}

function etiquetasDeTexto(texto: string): string[] {
  return [...new Set(texto.split(',').map((e) => e.trim()).filter(Boolean))];
}

export function datosNuevaTarea(valores: ValoresFormulario): NuevaTarea {
  const datos: NuevaTarea = {
    titulo: valores.titulo.trim(),
    descripcion: valores.descripcion.trim(),
    prioridad: valores.prioridad,
    responsableId: Number(valores.responsableId),
    etiquetas: etiquetasDeTexto(valores.etiquetas),
  };
  if (valores.fechaLimite) datos.fechaLimite = valores.fechaLimite;
  return datos;
}

// Solo los campos que cambiaron. Es importante con la fecha límite: reenviar una fecha ya
// vencida haría que la API rechazara editar, por ejemplo, solo el título.
export function cambiosTarea(original: Tarea, valores: ValoresFormulario): CambiosTarea {
  const nuevos = datosNuevaTarea(valores);
  const cambios: CambiosTarea = {};
  if (nuevos.titulo !== original.titulo) cambios.titulo = nuevos.titulo;
  if (nuevos.descripcion !== original.descripcion) cambios.descripcion = nuevos.descripcion;
  if (nuevos.prioridad !== original.prioridad) cambios.prioridad = nuevos.prioridad;
  if (nuevos.responsableId !== original.responsableId) cambios.responsableId = nuevos.responsableId;
  if (nuevos.etiquetas!.join('\n') !== original.etiquetas.join('\n')) cambios.etiquetas = nuevos.etiquetas;
  const fechaOriginal = original.fechaLimite?.slice(0, 10) ?? '';
  if (valores.fechaLimite !== fechaOriginal) cambios.fechaLimite = valores.fechaLimite || null;
  return cambios;
}

// Validación en el navegador con los mismos esquemas que la API, más las reglas del dominio
// que más se ven (título vacío, fecha pasada), para avisar antes de enviar. La API vuelve a
// validarlo todo: esto es solo comodidad para el usuario.
export function validarFormulario(
  valores: ValoresFormulario,
  original?: Tarea,
  ahora = new Date(),
): ErroresFormulario {
  const errores: ErroresFormulario = {};
  if (!valores.titulo.trim()) errores.titulo = 'El título es obligatorio';
  if (!valores.responsableId) errores.responsableId = 'Elige un responsable';
  const fechaCambiada = valores.fechaLimite !== (original?.fechaLimite?.slice(0, 10) ?? '');
  if (valores.fechaLimite && fechaCambiada && valores.fechaLimite < hoyIso(ahora)) {
    errores.fechaLimite = 'La fecha límite no puede ser anterior a hoy';
  }

  const resultado = original
    ? esquemaEditarTarea.safeParse(cambiosTarea(original, valores))
    : esquemaCrearTarea.safeParse(datosNuevaTarea(valores));
  if (!resultado.success) {
    for (const issue of resultado.error.issues) {
      const campo = String(issue.path[0] ?? 'general') as keyof ErroresFormulario;
      // "Sin cambios" en una edición no es un error que mostrar: simplemente no se envía.
      if (original && campo === 'general') continue;
      errores[campo] ??= issue.message;
    }
  }
  return errores;
}
