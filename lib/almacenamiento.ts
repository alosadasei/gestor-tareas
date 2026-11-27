import {
  type CORSRule,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutBucketCorsCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { configAlmacenamiento } from './env';

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

// El navegador sube el archivo con un PUT a otro origen (el del almacenamiento), así que el
// bucket tiene que permitirlo en su CORS para los orígenes de la app, y solo eso: la descarga
// es un enlace normal y no necesita CORS. Content-Type es la única cabecera que envía el
// cliente (Content-Length la pone el navegador). MaxAgeSeconds ahorra la petición OPTIONS
// previa en las subidas siguientes.
export function reglasCors(origenes: string[]): CORSRule[] {
  for (const origen of origenes) {
    if (URL.parse(origen)?.origin !== origen) {
      throw new Error(`«${origen}» no es un origen válido (esquema://host[:puerto], sin barra final)`);
    }
  }
  if (origenes.length === 0) throw new Error('Indica al menos un origen');
  return [{ AllowedOrigins: origenes, AllowedMethods: ['PUT'], AllowedHeaders: ['content-type'], MaxAgeSeconds: 3600 }];
}

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

  // Sustituye el CORS del bucket (se usa al configurar un entorno, no desde la app).
  async configurarCors(origenes: string[]): Promise<void> {
    await this.s3.send(
      new PutBucketCorsCommand({ Bucket: this.bucket, CORSConfiguration: { CORSRules: reglasCors(origenes) } }),
    );
  }
}

export function crearAlmacenamientoS3(): AlmacenamientoS3 {
  const config = configAlmacenamiento();
  const s3 = new S3Client({
    endpoint: config.STORAGE_ENDPOINT,
    region: config.STORAGE_REGION,
    credentials: {
      accessKeyId: config.STORAGE_ACCESS_KEY_ID,
      secretAccessKey: config.STORAGE_SECRET_ACCESS_KEY,
    },
    // URLs del tipo endpoint/bucket/clave: las aceptan todos los proveedores compatibles,
    // mientras que bucket.endpoint/clave necesita DNS por bucket (no existe en local).
    forcePathStyle: true,
    // Por defecto el SDK mete en la URL firmada el CRC32 de un cuerpo vacío, y un proveedor
    // que lo compruebe (R2, Backblaze B2…) rechaza cualquier archivo real. Sin checksum
    // salvo cuando la operación lo exija, la subida depende solo de la firma.
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
  });
  return new AlmacenamientoS3(s3, config.STORAGE_BUCKET);
}
