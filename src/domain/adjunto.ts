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
    throw new Error('El nombre del archivo no puede estar vacío');
  }
  if (!(TIPOS_ADJUNTO_PERMITIDOS as readonly string[]).includes(tipoMime)) {
    throw new Error(`Tipo de archivo no permitido: ${tipoMime}`);
  }
  if (!Number.isInteger(tamanoBytes) || tamanoBytes <= 0) {
    throw new Error('El tamaño del archivo debe ser un número entero positivo');
  }
  if (tamanoBytes > TAMANO_MAXIMO_ADJUNTO) {
    throw new Error('El archivo supera el tamaño máximo de 10 MB');
  }
}

export function crearAdjunto(
  id: number,
  datos: DatosNuevoAdjunto,
  subidoEn: Date = new Date(),
): Adjunto {
  validarAdjunto(datos.nombreArchivo, datos.tipoMime, datos.tamanoBytes);
  if (datos.clave.trim() === '') {
    throw new Error('El adjunto necesita la clave del archivo en el almacenamiento');
  }
  return { id, ...datos, nombreArchivo: datos.nombreArchivo.trim(), subidoEn };
}
