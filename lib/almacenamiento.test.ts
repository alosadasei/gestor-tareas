import { S3Client } from '@aws-sdk/client-s3';
import { describe, expect, it } from 'vitest';
import { AlmacenamientoS3, reglasCors, SEGUNDOS_URL_DESCARGA, SEGUNDOS_URL_SUBIDA } from './almacenamiento';

// Firmar una URL es un cálculo local con las credenciales: no hace falta un bucket real.
const almacenamiento = new AlmacenamientoS3(
  new S3Client({
    endpoint: 'http://localhost:9090',
    region: 'auto',
    credentials: { accessKeyId: 'clave', secretAccessKey: 'secreto' },
    forcePathStyle: true,
  }),
  'gestor-tareas',
);

describe('AlmacenamientoS3', () => {
  it('firma una URL de subida PUT con caducidad, tipo y tamaño dentro de la firma', async () => {
    const antes = Date.now();
    const subida = await almacenamiento.urlSubida('tareas/1/abc/informe.pdf', 'application/pdf', 2048);
    const url = new URL(subida.url);

    expect(url.origin + url.pathname).toBe('http://localhost:9090/gestor-tareas/tareas/1/abc/informe.pdf');
    expect(url.searchParams.get('X-Amz-Expires')).toBe(String(SEGUNDOS_URL_SUBIDA));
    expect(url.searchParams.get('X-Amz-SignedHeaders')).toBe('content-length;content-type;host');
    expect(url.searchParams.get('X-Amz-Signature')).toMatch(/^[0-9a-f]{64}$/);
    expect(subida.metodo).toBe('PUT');
    expect(subida.cabeceras).toEqual({ 'Content-Type': 'application/pdf' });
    expect(subida.expiraEn.getTime()).toBeGreaterThanOrEqual(antes + SEGUNDOS_URL_SUBIDA * 1000);
  });

  it('firma una URL de descarga que conserva el nombre original del archivo', async () => {
    const url = new URL(await almacenamiento.urlDescarga('tareas/1/abc/x.pdf', 'Informe final ñ.pdf'));

    expect(url.searchParams.get('X-Amz-Expires')).toBe(String(SEGUNDOS_URL_DESCARGA));
    expect(url.searchParams.get('response-content-disposition')).toBe(
      "attachment; filename*=UTF-8''Informe%20final%20%C3%B1.pdf",
    );
  });
});

describe('reglasCors', () => {
  it('permite solo el PUT de la subida con Content-Type desde los orígenes indicados', () => {
    expect(reglasCors(['https://gestor.example.com', 'http://localhost:3000'])).toEqual([
      {
        AllowedOrigins: ['https://gestor.example.com', 'http://localhost:3000'],
        AllowedMethods: ['PUT'],
        AllowedHeaders: ['content-type'],
        MaxAgeSeconds: 3600,
      },
    ]);
  });

  it('rechaza lo que no es un origen exacto', () => {
    expect(() => reglasCors(['https://gestor.example.com/'])).toThrow(/no es un origen válido/);
    expect(() => reglasCors(['gestor.example.com'])).toThrow(/no es un origen válido/);
    expect(() => reglasCors([])).toThrow(/al menos un origen/);
  });
});
