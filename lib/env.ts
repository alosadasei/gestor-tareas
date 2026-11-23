import { z } from 'zod';

// Variables privadas: solo se leen en el servidor (las públicas están en envPublico.ts, para
// no llevar Zod al navegador) y se validan con Zod al usarlas, no al
// importar este módulo, para que el build y los tests unitarios no exijan ninguna. Se leen
// de process.env en cada llamada (sin guardarlas): los tests cambian DATABASE_URL al vuelo.
// Una variable vacía (`REDIS_URL=` en el .env) cuenta como no definida.

const vaciaComoAusente = (valor: unknown) => (valor === '' ? undefined : valor);
const obligatoria = <T extends z.ZodType>(esquema: T) => z.preprocess(vaciaComoAusente, esquema);
const opcional = <T extends z.ZodType>(esquema: T) => z.preprocess(vaciaComoAusente, esquema.optional());

const url = (protocolo: RegExp, formato: string) =>
  z.url({
    protocol: protocolo,
    error: (fallo) => (fallo.input === undefined ? 'es obligatoria' : `debe ser una URL ${formato}`),
  });
const urlPostgres = url(/^postgres(ql)?$/, 'postgres://…');

const texto = z.string({ error: 'es obligatoria' });

const esquemaBaseDeDatos = z.object({
  // Conexión de la app. En Neon, la URL con pooler (host con -pooler).
  DATABASE_URL: obligatoria(urlPostgres),
  // Conexión directa, sin pooler, para las migraciones. Si falta, se usa DATABASE_URL.
  DIRECT_URL: opcional(urlPostgres),
});

const esquemaAlmacenamiento = z.object({
  STORAGE_ENDPOINT: obligatoria(url(/^https?$/, 'http(s)://…')),
  STORAGE_REGION: obligatoria(z.string().default('auto')),
  STORAGE_BUCKET: obligatoria(texto),
  STORAGE_ACCESS_KEY_ID: obligatoria(texto),
  STORAGE_SECRET_ACCESS_KEY: obligatoria(texto),
});

export const NIVELES_LOG = ['trace', 'debug', 'info', 'warn', 'error', 'fatal', 'silent'] as const;

const esquemaOpcionales = z.object({
  // Sin REDIS_URL la app funciona sin caché.
  REDIS_URL: opcional(url(/^rediss?$/, 'redis://…')),
  LOG_LEVEL: opcional(z.enum(NIVELES_LOG)),
});

export class ErrorConfiguracion extends Error {
  override name = 'ErrorConfiguracion';
}

// Valida y, si algo falla, lanza un único error que lista todas las variables incorrectas
// (nunca sus valores, que pueden ser secretos).
type Entorno = Record<string, string | undefined>;

function validar<T extends z.ZodType>(esquema: T, entorno: Entorno): z.output<T> {
  const resultado = esquema.safeParse(entorno);
  if (resultado.success) return resultado.data;
  const problemas = resultado.error.issues.map((i) => `${i.path.join('.')} ${i.message}`);
  throw new ErrorConfiguracion(`Variables de entorno incorrectas: ${problemas.join('; ')}`);
}

export const configBaseDeDatos = (entorno: Entorno = process.env) => validar(esquemaBaseDeDatos, entorno);
export const configAlmacenamiento = (entorno: Entorno = process.env) => validar(esquemaAlmacenamiento, entorno);
export const configOpcional = (entorno: Entorno = process.env) => validar(esquemaOpcionales, entorno);
