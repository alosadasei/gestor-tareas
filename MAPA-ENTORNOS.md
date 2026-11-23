# Mapa de entornos del Gestor de Tareas

## Paso 1 — Clasificación de variables

| Variable | Tipo | Justificación |
|---|---|---|
| `DATABASE_URL` | Privada | Contiene usuario, contraseña y host de la base de datos; si llegara al navegador, cualquiera podría acceder a los datos. |
| `DIRECT_URL` | Privada | Es la misma BD sin pooler, para las migraciones: tiene las mismas credenciales que `DATABASE_URL`. |
| `STORAGE_ACCESS_KEY_ID` / `STORAGE_SECRET_ACCESS_KEY` | Privada | Credenciales del bucket de adjuntos: con ellas se puede leer, subir y borrar cualquier archivo. |
| `NEXT_PUBLIC_API_URL` | Pública | Es solo una dirección que el navegador necesita para llamar a la API y se ve igualmente en las peticiones de red. |
| `NEXT_PUBLIC_APP_ENV` | Pública | Es una etiqueta ("development", "preview", "production") pensada para mostrarse en la interfaz y no es sensible. |

## Paso 3 — ¿Por qué un secreto subido al repositorio está comprometido aunque se borre?

<!-- Git guarda todo el historial: borrar el fichero en un commit posterior no elimina el secreto de los commits antiguos, y cualquiera con acceso (o un clon/fork previo) puede recuperarlo.
     Además, los bots rastrean GitHub en busca de claves en segundos, así que hay que revocarlo y generar uno nuevo. -->

Un secreto subido al repositorio se considera comprometido porque Git conserva el historial: borrarlo en un commit posterior no lo quita de los commits antiguos, que cualquiera con acceso, clon o fork puede recuperar. Además, hay bots que rastrean GitHub en segundos, así que la única solución segura es revocarlo y generar uno nuevo.

## Paso 5 — Valores por entorno

| Variable | development | preview | production |
|---|---|---|---|
| `DATABASE_URL` | `postgres://dev:dev@localhost:5432/gestor_tareas_dev` (BD local de juguete) | Rama de Neon propia de la preview (con pooler), p. ej. `postgres://***@ep-preview-…-pooler.eu-central-1.aws.neon.tech/gestor_tareas` | Neon `main` (con pooler), p. ej. `postgres://***@ep-…-pooler.eu-central-1.aws.neon.tech/gestor_tareas` |
| `DIRECT_URL` | Vacía (en local no hay pooler) | Rama de Neon de la preview, conexión directa | Neon `main`, conexión directa |
| `STORAGE_*` | Simulador local (`http://localhost:9090`, bucket `gestor-tareas`) | Bucket de preview | Bucket de producción, con un token limitado a ese bucket |
| `NEXT_PUBLIC_API_URL` | `http://localhost:3000/api` | URL de la propia preview, p. ej. `https://gestor-tareas-git-rama-….vercel.app/api` | `https://gestor-tareas-blush.vercel.app/api` |
| `NEXT_PUBLIC_APP_ENV` | `development` | `preview` | `production` |

## Paso 6 — Dónde se configuran

### Vercel

```bash
vercel env add DATABASE_URL production
vercel env add DATABASE_URL preview
```

Cada comando pide el valor por consola, así que no queda en el historial del shell ni en el repo. La BD real solo va en `production` para que las previews (que ejecuta código de ramas sin revisar) nunca puedan leer ni modificar datos reales: usan la BD de pruebas del ámbito `preview`.

### GitHub Actions

Se guarda el valor en Settings → Secrets and variables → Actions → New repository secret (`DATABASE_URL`) y se inyecta en el paso de build:

```yaml
      - name: Build
        run: npm run build
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

Nunca se imprime el secreto con `echo`, porque los logs del workflow son visibles para quien tenga acceso al repo y un valor impreso (o transformado) puede quedar expuesto en texto claro.

La guía completa de despliegue (Neon, R2, migraciones y variables de Vercel) está en [docs/despliegue.md](docs/despliegue.md).
