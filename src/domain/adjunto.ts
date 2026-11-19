import { ErrorValidacion } from './errores';

export const TAMANO_MAXIMO_ADJUNTO = 10 * 1024 * 1024; // 10 MB

export const TIPOS_ADJUNTO_PERMITIDOS = [
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'application/pdf',
  'text/plain',
  'text/csv',
] as const;

// El fichero vive en el almacenamiento externo; aquí solo se guarda su referencia
// (`clave` dentro del bucket) y los metadatos para listarlo.
export type Adjunto = {
  id: number;
  tareaId: number;
  nombreArchivo: string;
  tipoMime: string;
  tamanoBytes: number;
  clave: string;
  subidoEn: Date;
};

export type DatosNuevoAdjunto = Omit<Adjunto, 'id' | 'subidoEn'>;

export function validarAdjunto(nombreArchivo: string, tipoMime: string, tamanoBytes: number) {
  if (nombreArchivo.trim() === '') {
    throw new ErrorValidacion('El nombre del archivo no puede estar vacío');
  }
  if (!(TIPOS_ADJUNTO_PERMITIDOS as readonly string[]).includes(tipoMime)) {
    throw new ErrorValidacion(`Tipo de archivo no permitido: ${tipoMime}`);
  }
  if (!Number.isInteger(tamanoBytes) || tamanoBytes <= 0) {
    throw new ErrorValidacion('El tamaño del archivo debe ser un número entero positivo');
  }
  if (tamanoBytes > TAMANO_MAXIMO_ADJUNTO) {
    throw new ErrorValidacion('El archivo supera el tamaño máximo de 10 MB');
  }
}

export function crearAdjunto(
  id: number,
  datos: DatosNuevoAdjunto,
  subidoEn: Date = new Date(),
): Adjunto {
  validarAdjunto(datos.nombreArchivo, datos.tipoMime, datos.tamanoBytes);
  if (datos.clave.trim() === '') {
    throw new ErrorValidacion('El adjunto necesita la clave del archivo en el almacenamiento');
  }
  return { id, ...datos, nombreArchivo: datos.nombreArchivo.trim(), subidoEn };
}

// Clave del fichero en el almacenamiento: tareas/<tareaId>/<uuid>/<nombre saneado>. El uuid
// evita que dos subidas con el mismo nombre se pisen; el nombre se sanea para que la clave
// sea legible y segura en una URL (el nombre original se guarda aparte, en nombreArchivo).
export function generarClaveAdjunto(
  tareaId: number,
  nombreArchivo: string,
  uuid: string = crypto.randomUUID(),
): string {
  const saneado =
    nombreArchivo
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^\w.-]+/g, '_')
      .replace(/\.{2,}/g, '.')
      .slice(-100) || 'archivo';
  return `tareas/${tareaId}/${uuid}/${saneado}`;
}

// Al registrar un adjunto se comprueba que la clave es de esa tarea: si no, se podría
// enlazar a una tarea el fichero subido para otra.
export function claveEsDeTarea(clave: string, tareaId: number): boolean {
  return clave.startsWith(`tareas/${tareaId}/`) && !clave.includes('..');
}
