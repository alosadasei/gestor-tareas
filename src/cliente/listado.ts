// Utilidades del listado de tareas (/tareas) que trabajan con los query params de la URL:
// el estado del listado (filtros, orden, página) vive en la URL, así se puede compartir,
// recargar o volver atrás sin perderlo.

export type ParametrosUrl = Record<string, string | string[] | undefined>;

// Los formularios GET envían también los campos vacíos (?texto=&estado=): se descartan para
// que cuenten como "sin filtro". Si un parámetro viene repetido, vale el primero.
export function limpiarParametros(parametros: ParametrosUrl): Record<string, string> {
  const limpios: Record<string, string> = {};
  for (const [clave, valor] of Object.entries(parametros)) {
    const texto = Array.isArray(valor) ? valor[0] : valor;
    if (texto !== undefined && texto.trim() !== '') limpios[clave] = texto;
  }
  return limpios;
}

// URL del listado con los parámetros actuales y algunos cambiados (null quita el parámetro).
export function urlListado(actuales: Record<string, string>, cambios: Record<string, string | null> = {}): string {
  const query = new URLSearchParams(actuales);
  for (const [clave, valor] of Object.entries(cambios)) {
    if (valor === null) query.delete(clave);
    else query.set(clave, valor);
  }
  const texto = query.toString();
  return texto ? `/tareas?${texto}` : '/tareas';
}

export type Orden = { campo: 'id' | 'prioridad' | 'fechaLimite'; direccion: 'asc' | 'desc' };

// Al pulsar una cabecera: si ya se ordena por esa columna se invierte la dirección; si no,
// se ordena por ella ascendente. Cambiar el orden vuelve a la primera página.
export function urlOrdenarPor(actuales: Record<string, string>, orden: Orden, campo: Orden['campo']): string {
  const direccion = orden.campo === campo && orden.direccion === 'asc' ? 'desc' : 'asc';
  return urlListado(actuales, { ordenarPor: campo, direccion, pagina: null });
}

// "Mostrando 21–40 de 45"
export function rangoMostrado(pagina: number, tamanoPagina: number, mostradas: number, total: number): string {
  if (mostradas === 0) return `0 de ${total}`;
  const desde = (pagina - 1) * tamanoPagina + 1;
  return `${desde}–${desde + mostradas - 1} de ${total}`;
}
