#!/bin/sh
# Smoke test de un despliegue: comprueba que la app responde de verdad, no solo que el build
# terminó. Lo ejecuta la CI tras cada despliegue a producción y se puede lanzar a mano:
#   sh scripts/comprobar-despliegue.sh https://gestor-tareas-blush.vercel.app
# Sale con error si algo falla, indicando qué.
set -eu

URL="${1:?Uso: comprobar-despliegue.sh <url-base>}"
URL="${URL%/}"
fallos=0

# comprobar <ruta> <código esperado> [texto que debe aparecer en la respuesta]
comprobar() {
  ruta="$1"; esperado="$2"; texto="${3:-}"
  cuerpo=$(mktemp)
  codigo=$(curl -sS -o "$cuerpo" -w '%{http_code}' --max-time 20 "$URL$ruta" || echo 000)
  if [ "$codigo" != "$esperado" ]; then
    echo "✗ $ruta → $codigo (se esperaba $esperado)"
    fallos=$((fallos + 1))
  elif [ -n "$texto" ] && ! grep -q "$texto" "$cuerpo"; then
    echo "✗ $ruta → $codigo, pero la respuesta no contiene «$texto»"
    fallos=$((fallos + 1))
  else
    echo "✓ $ruta → $codigo"
  fi
  rm -f "$cuerpo"
}

# La primera petición tras un despliegue puede pillar la función en frío: se reintenta el
# health check unos segundos antes de dar el despliegue por roto.
for intento in 1 2 3 4 5; do
  if curl -sf --max-time 20 "$URL/api/health" | grep -q '"ok"'; then break; fi
  echo "… /api/health aún no responde ok (intento $intento)"
  sleep 5
done

comprobar /api/health 200 '"status":"ok"'   # la BD responde a un SELECT 1
comprobar / 200 'Gestor de Tareas'           # landing estática
comprobar /tablero 200                       # página que lee de la BD
comprobar '/api/tareas?tamanoPagina=1' 200 '"data"'
comprobar /api/openapi.json 200 '"openapi"'
comprobar /api/tareas/999999 404 '"NO_ENCONTRADO"'  # errores con el formato de la API

if [ "$fallos" -gt 0 ]; then
  echo "$fallos comprobaciones fallidas en $URL"
  exit 1
fi
echo "Despliegue correcto: $URL"
