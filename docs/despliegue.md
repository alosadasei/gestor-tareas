# Despliegue

La app se despliega en **Vercel**, con la base de datos en **Neon** (Postgres serverless, que no se pausa) y los adjuntos en un almacenamiento compatible con S3 (**Cloudflare R2**, Supabase Storage o AWS S3). Redis es opcional y en producción no se usa: sin `REDIS_URL` las estadísticas se calculan sin caché.

```
push a una rama ──► CI (lint, tipos, tests, e2e) ──► PR ──► merge a main
        │                                                      │
        ▼                                                      ▼
Vercel preview                                        Vercel production
  migrate deploy → BD de preview                        migrate deploy → BD de producción
  next build                                            next build
```

## Cómo se aplican las migraciones

Vercel ejecuta `npm run vercel-build` en lugar de `npm run build` cuando existe ese script ([scripts/vercel-build.sh](../scripts/vercel-build.sh)):

1. `prisma migrate deploy` aplica las migraciones pendientes de `prisma/migrations` a la BD del entorno. No genera ni resetea nada, y si no hay migraciones pendientes no hace nada.
2. `next build`.

Si la migración falla, el build falla y Vercel sigue sirviendo la versión anterior, así que nunca hay código nuevo sobre un esquema viejo. Las migraciones tienen que ser **compatibles hacia atrás** (añadir antes de quitar), porque durante unos segundos la versión anterior sigue sirviendo peticiones sobre el esquema nuevo.

En el proyecto de Vercel, *Settings → Build and Deployment → Build Command* tiene que estar **sin override**, para que use `vercel-build`.

## 1. Base de datos (Neon)

1. Crea un proyecto en Neon (región cercana a la de las funciones de Vercel, p. ej. Frankfurt `eu-central-1`).
2. Copia las dos cadenas de conexión de la rama `main`:
   - **Con pooler** (host con `-pooler`) → `DATABASE_URL`. La usa la app: cada invocación serverless abre conexiones y el pooler evita agotar las de Postgres.
   - **Directa** (sin `-pooler`) → `DIRECT_URL`. La usa `prisma migrate deploy`, que no funciona a través del pooler.
3. **Previews:** con la integración de Neon para Vercel, cada preview recibe una rama de Neon propia (copia de producción) y su `DATABASE_URL`. Así las migraciones de una rama sin revisar nunca tocan producción. Sin la integración, crea una segunda BD solo para preview y ponla en el ámbito *Preview* de Vercel.
4. Datos iniciales: la app necesita al menos un usuario. El seed **vacía las tablas**, así que solo se ejecuta una vez sobre una BD recién creada:
   ```bash
   DATABASE_URL="<cadena directa de Neon>" npm run db:deploy
   DATABASE_URL="<cadena directa de Neon>" npm run db:seed
   ```

## 2. Almacenamiento de adjuntos (R2)

1. Crea un bucket privado (sin acceso público): las descargas usan URLs firmadas.
2. Crea un token de API con permiso *Object Read & Write* solo sobre ese bucket. Te da `STORAGE_ACCESS_KEY_ID`, `STORAGE_SECRET_ACCESS_KEY` y el endpoint `https://<cuenta>.r2.cloudflarestorage.com`.
3. **CORS.** El navegador sube el archivo directamente al bucket con un `PUT` (otro origen), así que el bucket tiene que permitirlo desde la URL de la app. Con las variables `STORAGE_*` en `.env.local` o en el entorno:
   ```bash
   npm run storage:cors -- https://gestor-tareas-blush.vercel.app http://localhost:3000
   ```
   Solo permite `PUT` con la cabecera `Content-Type` ([lib/almacenamiento.ts](../lib/almacenamiento.ts), `reglasCors`). Para las previews, añade su dominio o usa un bucket aparte con `*`. El simulador local (`docker compose up -d s3`) no admite esta operación y ya acepta cualquier origen.

## 3. Variables en Vercel

Todas las privadas se validan con Zod al arrancar ([lib/env.ts](../lib/env.ts)). Si falta una obligatoria o su formato es incorrecto, el servidor no arranca y el log dice qué variable es, sin mostrar su valor.

| Variable | Production | Preview | ¿Obligatoria? |
|---|---|---|---|
| `DATABASE_URL` | Neon `main`, con pooler | Rama de Neon de la preview (la pone la integración) | Sí |
| `DIRECT_URL` | Neon `main`, directa | Rama de la preview, directa | No (si falta, se migra con `DATABASE_URL`) |
| `STORAGE_ENDPOINT`, `STORAGE_BUCKET`, `STORAGE_ACCESS_KEY_ID`, `STORAGE_SECRET_ACCESS_KEY` | Bucket de producción | Bucket de preview | No para arrancar; sin ellas no hay adjuntos |
| `STORAGE_REGION` | `auto` | `auto` | No (por defecto `auto`) |
| `REDIS_URL` | — | — | No |
| `LOG_LEVEL` | `info` | `debug` | No (por defecto `info`) |
| `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN` | DSN de Sentry | El mismo | No |
| `NEXT_PUBLIC_APP_ENV` | `production` | `preview` | No |
| `NEXT_PUBLIC_API_URL` | `https://…/api`, o vacía para usar `/api` de la misma app | Vacía | No |

Se añaden sin que el valor pase por el historial del shell:

```bash
vercel env add DATABASE_URL production
vercel env add DIRECT_URL production
```

## 4. Comprobar el despliegue

```bash
curl -i https://gestor-tareas-blush.vercel.app/api/health
```

- `200 {"status":"ok"}`: la BD responde a un `SELECT 1`.
- `503 {"status":"degraded"}`: la BD no responde (o tarda más de 1,5 s). La respuesta no incluye detalles; el motivo está en los logs de Vercel.
