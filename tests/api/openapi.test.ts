import { compileErrors, validate } from '@readme/openapi-parser';
import { globSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { generarDocumentoOpenApi } from '../../src/api/openapi';
import { GET as GET_DOCS } from '../../src/app/api/docs/route';
import { GET as GET_OPENAPI } from '../../src/app/api/openapi.json/route';

const METODOS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const;
// Las rutas de la propia documentación no se documentan a sí mismas.
const NO_DOCUMENTADAS = ['/api/openapi.json', '/api/docs'];

// src/app/api/tareas/[id]/estado/route.ts → /api/tareas/{id}/estado
function rutaOpenApi(fichero: string): string {
  const relativa = path.dirname(path.relative('src/app', fichero)).split(path.sep).join('/');
  return `/${relativa}`.replace(/\[(\w+)\]/g, '{$1}');
}

async function operacionesImplementadas(): Promise<string[]> {
  const operaciones: string[] = [];
  for (const fichero of globSync('src/app/api/**/route.ts')) {
    const ruta = rutaOpenApi(fichero);
    if (NO_DOCUMENTADAS.includes(ruta)) continue;
    const modulo = await import(path.resolve(fichero));
    for (const metodo of METODOS) if (metodo in modulo) operaciones.push(`${metodo} ${ruta}`);
  }
  return operaciones.sort();
}

function operacionesDocumentadas(documento: ReturnType<typeof generarDocumentoOpenApi>): string[] {
  const rutas = documento.paths as Record<string, Record<string, unknown>>;
  return Object.entries(rutas)
    .flatMap(([ruta, item]) =>
      Object.keys(item)
        .filter((clave) => METODOS.includes(clave.toUpperCase() as (typeof METODOS)[number]))
        .map((metodo) => `${metodo.toUpperCase()} ${ruta}`),
    )
    .sort();
}

describe('documentación OpenAPI', () => {
  it('es un documento OpenAPI 3.1 válido', async () => {
    // validate() resuelve las $ref sobre el objeto que recibe: se le pasa una copia.
    const resultado = await validate(structuredClone(generarDocumentoOpenApi()) as never);
    expect(resultado.valid, compileErrors(resultado)).toBe(true);
  });

  it('documenta exactamente las rutas y métodos que implementa la API', async () => {
    const implementadas = await operacionesImplementadas();
    expect(implementadas.length).toBeGreaterThanOrEqual(8);
    expect(operacionesDocumentadas(generarDocumentoOpenApi())).toEqual(implementadas);
  });

  it('GET /api/openapi.json sirve el documento', async () => {
    const respuesta = await GET_OPENAPI(new Request('http://localhost/api/openapi.json'), {});
    expect(respuesta.status).toBe(200);
    expect(await respuesta.json()).toEqual(generarDocumentoOpenApi());
  });

  it('GET /api/docs sirve la página que carga el documento', async () => {
    const respuesta = GET_DOCS();
    expect(respuesta.headers.get('Content-Type')).toMatch(/text\/html/);
    expect(await respuesta.text()).toContain('data-url="/api/openapi.json"');
  });
});
