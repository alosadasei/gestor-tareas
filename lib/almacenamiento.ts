import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { leerVariable } from './env';

// Los adjuntos no pasan por nuestro servidor: el navegador los sube directamente al
// almacenamiento con una URL firmada de corta duración, y en la BD solo se guarda la clave.
// Se usa la API S3, que hablan Cloudflare R2, Supabase Storage, AWS S3 y los simuladores
// locales, así que cambiar de proveedor es cambiar las variables STORAGE_*.

export const SEGUNDOS_URL_SUBIDA = 5 * 60;
export const SEGUNDOS_URL_DESCARGA = 10 * 60;

export type UrlSubida = {
  url: string;
  metodo: 'PUT';
  // Cabeceras que el cliente debe enviar tal cual: forman parte de la firma.
  cabeceras: Record<string, string>;
  expiraEn: Date;
};

export interface Almacenamiento {
  urlSubida(clave: string, tipoMime: string, tamanoBytes: number): Promise<UrlSubida>;
  urlDescarga(clave: string, nombreArchivo: string): Promise<string>;
  // Tamaño del objeto subido, o undefined si no existe.
  tamano(clave: string): Promise<number | undefined>;
  borrar(clave: string): Promise<void>;
}

export class AlmacenamientoS3 implements Almacenamiento {
  constructor(
    private readonly s3: S3Client,
    private readonly bucket: string,
  ) {}

  async urlSubida(clave: string, tipoMime: string, tamanoBytes: number): Promise<UrlSubida> {
    const comando = new PutObjectCommand({
      Bucket: this.bucket,
      Key: clave,
      ContentType: tipoMime,
      ContentLength: tamanoBytes,
    });
    // Tipo y tamaño van dentro de la firma: si el cliente sube otro tipo de fichero u otro
    // tamaño del que declaró (y validamos), el almacenamiento rechaza la subida.
    const url = await getSignedUrl(this.s3, comando, {
      expiresIn: SEGUNDOS_URL_SUBIDA,
      signableHeaders: new Set(['content-type', 'content-length']),
    });
    return {
      url,
      metodo: 'PUT',
      cabeceras: { 'Content-Type': tipoMime },
      expiraEn: new Date(Date.now() + SEGUNDOS_URL_SUBIDA * 1000),
    };
  }

  urlDescarga(clave: string, nombreArchivo: string): Promise<string> {
    // Se descarga con el nombre original (filename* admite acentos y espacios).
    const comando = new GetObjectCommand({
      Bucket: this.bucket,
      Key: clave,
      ResponseContentDisposition: `attachment; filename*=UTF-8''${encodeURIComponent(nombreArchivo)}`,
    });
    return getSignedUrl(this.s3, comando, { expiresIn: SEGUNDOS_URL_DESCARGA });
  }

  async tamano(clave: string): Promise<number | undefined> {
    try {
      const cabecera = await this.s3.send(new HeadObjectCommand({ Bucket: this.bucket, Key: clave }));
      return cabecera.ContentLength;
    } catch (error) {
      if ((error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode === 404) {
        return undefined;
      }
      throw error;
    }
  }

  async borrar(clave: string): Promise<void> {
    await this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: clave }));
  }
}

export function crearAlmacenamientoS3(): AlmacenamientoS3 {
  const s3 = new S3Client({
    endpoint: leerVariable('STORAGE_ENDPOINT'),
    region: process.env.STORAGE_REGION ?? 'auto',
    credentials: {
      accessKeyId: leerVariable('STORAGE_ACCESS_KEY_ID'),
      secretAccessKey: leerVariable('STORAGE_SECRET_ACCESS_KEY'),
    },
    // URLs del tipo endpoint/bucket/clave: las aceptan todos los proveedores compatibles,
    // mientras que bucket.endpoint/clave necesita DNS por bucket (no existe en local).
    forcePathStyle: true,
  });
  return new AlmacenamientoS3(s3, leerVariable('STORAGE_BUCKET'));
}
