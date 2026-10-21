# Mapa de entornos del Gestor de Tareas

## Paso 1 — Clasificación de variables

| Variable | Tipo | Justificación |
|---|---|---|
| `DATABASE_URL` | Privada | Contiene usuario, contraseña y host de la base de datos; si llegara al navegador, cualquiera podría acceder a los datos. |
| `AUTH_SECRET` | Privada | Es la clave que firma las sesiones: quien la conozca puede falsificar sesiones de cualquier usuario. |
| `NEXT_PUBLIC_API_URL` | Pública | Es solo una dirección que el navegador necesita para llamar a la API y se ve igualmente en las peticiones de red. |
| `NEXT_PUBLIC_APP_ENV` | Pública | Es una etiqueta ("development", "preview", "production") pensada para mostrarse en la interfaz y no es sensible. |

## Paso 3 — ¿Por qué un secreto subido al repositorio está comprometido aunque se borre?

<!-- Git guarda todo el historial: borrar el fichero en un commit posterior no elimina el secreto de los commits antiguos, y cualquiera con acceso (o un clon/fork previo) puede recuperarlo.
     Además, los bots rastrean GitHub en busca de claves en segundos, así que hay que revocarlo y generar uno nuevo. -->

Un secreto subido al repositorio se considera comprometido porque Git conserva el historial: borrarlo en un commit posterior no lo quita de los commits antiguos, que cualquiera con acceso, clon o fork puede recuperar. Además, hay bots que rastrean GitHub en segundos, así que la única solución segura es revocarlo y generar uno nuevo.

## Paso 5 — Valores por entorno

| Variable | development | preview | production |
|---|---|---|---|
| `DATABASE_URL` | `postgres://dev:dev@localhost:5432/gestor_tareas_dev` (BD local de juguete) | BD de pruebas compartida, p. ej. `postgres://preview_user:***@db-pruebas.ejemplo.com/gestor_tareas_preview` | BD real, p. ej. `postgres://prod_user:***@db-prod.ejemplo.com/gestor_tareas` |
| `AUTH_SECRET` | Clave de juguete (`clave-de-juguete-solo-para-desarrollo`) | Clave distinta, solo para preview | Clave larga y aleatoria, distinta de las demás |
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
