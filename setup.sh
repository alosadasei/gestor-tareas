#!/usr/bin/env bash
# Prepara el entorno local del Gestor de Tareas desde un clon recién hecho:
#   1. comprueba Node (22 o superior), npm y Docker;
#   2. instala las dependencias (npm ci, que también genera el cliente de Prisma);
#   3. crea .env.local a partir de .env.example con los valores locales;
#   4. levanta Postgres, Redis y el simulador de S3 con docker compose;
#   5. aplica las migraciones y carga los datos de ejemplo (seed).
#
# Uso: ./setup.sh [-y]
#   -y  no pregunta: si ya había un .env.local, vuelve a cargar el seed igualmente.
#
# Se puede ejecutar varias veces. Nunca sobrescribe un .env.local que ya exista, y el seed
# (que VACÍA las tablas de desarrollo) solo se repite si se confirma o con -y.
# Puertos: POSTGRES_PORT, REDIS_PORT y S3_PORT (por defecto 5432, 6379 y 9090), p. ej.
#   POSTGRES_PORT=5433 ./setup.sh
set -euo pipefail

cd "$(dirname "$0")"

NODE_MINIMO=22
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
REDIS_PORT="${REDIS_PORT:-6379}"
S3_PORT="${S3_PORT:-9090}"
SIN_PREGUNTAR=false
[ "${1:-}" = "-y" ] && SIN_PREGUNTAR=true

paso() { printf '\n\033[1m▸ %s\033[0m\n' "$1"; }
ok() { printf '  ✓ %s\n' "$1"; }
fallo() {
  printf '  ✗ %s\n' "$1" >&2
  exit 1
}

# ── 1. Requisitos ────────────────────────────────────────────────────────────────────────
paso 'Comprobando requisitos'

command -v node >/dev/null || fallo "Falta Node.js $NODE_MINIMO o superior: https://nodejs.org"
version_node=$(node -p 'process.versions.node')
[ "${version_node%%.*}" -ge "$NODE_MINIMO" ] ||
  fallo "Node $version_node es demasiado antiguo: hace falta $NODE_MINIMO o superior"
ok "Node $version_node"

command -v npm >/dev/null || fallo 'Falta npm (viene con Node.js)'
ok "npm $(npm -v)"

command -v docker >/dev/null || fallo 'Falta Docker: https://docs.docker.com/get-docker/'
docker compose version >/dev/null 2>&1 || fallo 'Falta Docker Compose v2 (el comando «docker compose»)'
docker info >/dev/null 2>&1 || fallo 'Docker no está en marcha: arranca Docker Desktop (o el servicio docker) y repite'
ok "Docker $(docker version --format '{{.Server.Version}}') y $(docker compose version --short | sed 's/^/Compose /')"

# ── 2. Dependencias ──────────────────────────────────────────────────────────────────────
paso 'Instalando dependencias (npm ci)'
npm ci --no-audit --no-fund
ok 'Dependencias instaladas y cliente de Prisma generado'

# ── 3. Variables de entorno ──────────────────────────────────────────────────────────────
paso 'Variables de entorno (.env.local)'

# poner CLAVE valor: fija el valor de una línea CLAVE= de .env.local.
poner() {
  awk -v clave="$1" -v valor="$2" \
    'index($0, clave "=") == 1 { print clave "=" valor; next } { print }' .env.local >.env.local.tmp
  mv .env.local.tmp .env.local
}

if [ -f .env.local ]; then
  env_nuevo=false
  ok '.env.local ya existe: se deja tal cual'
else
  env_nuevo=true
  cp .env.example .env.local
  poner DATABASE_URL "postgresql://dev:dev@localhost:$POSTGRES_PORT/gestor_tareas_dev"
  poner TEST_DATABASE_URL "postgresql://dev:dev@localhost:$POSTGRES_PORT/gestor_tareas_test"
  poner NEXT_PUBLIC_APP_ENV development
  poner STORAGE_ENDPOINT "http://localhost:$S3_PORT"
  poner STORAGE_BUCKET gestor-tareas
  # El simulador de S3 acepta cualquier credencial.
  poner STORAGE_ACCESS_KEY_ID local
  poner STORAGE_SECRET_ACCESS_KEY local
  poner REDIS_URL "redis://localhost:$REDIS_PORT/0"
  poner TEST_REDIS_URL "redis://localhost:$REDIS_PORT/1"
  ok '.env.local creado con los valores locales (Sentry queda desactivado)'
fi

# ── 4. Servicios ─────────────────────────────────────────────────────────────────────────
paso 'Levantando Postgres, Redis y S3 (docker compose)'

# Un puerto ocupado por otro programa (p. ej. un Postgres instalado en el sistema) hace que la
# app hable con él en vez de con el contenedor. Se avisa antes de arrancar.
en_marcha=$(docker compose ps --services --status running 2>/dev/null || true)
for servicio_puerto in "postgres:$POSTGRES_PORT:POSTGRES_PORT" "redis:$REDIS_PORT:REDIS_PORT" "s3:$S3_PORT:S3_PORT"; do
  IFS=: read -r servicio puerto variable <<<"$servicio_puerto"
  if ! grep -qx "$servicio" <<<"$en_marcha" && nc -z localhost "$puerto" >/dev/null 2>&1; then
    fallo "El puerto $puerto ($servicio) ya está en uso. Libéralo o usa otro: $variable=<puerto> ./setup.sh
    (con un .env.local ya creado, cambia también el puerto en sus URLs)"
  fi
done

export POSTGRES_PORT REDIS_PORT S3_PORT
docker compose up -d --wait
ok "Servicios en marcha: Postgres :$POSTGRES_PORT, Redis :$REDIS_PORT, S3 :$S3_PORT"

# ── 5. Base de datos ─────────────────────────────────────────────────────────────────────
paso 'Base de datos: migraciones y datos de ejemplo'
npm run --silent db:deploy
ok 'Migraciones aplicadas'

sembrar=true
if ! $env_nuevo && ! $SIN_PREGUNTAR; then
  if [ -t 0 ]; then
    read -r -p '  ¿Volver a cargar los datos de ejemplo? Se BORRAN los datos de desarrollo [s/N] ' respuesta
    [[ "$respuesta" =~ ^[sS]$ ]] || sembrar=false
  else
    sembrar=false
  fi
fi
if $sembrar; then
  npm run --silent db:seed
  ok 'Datos de ejemplo cargados'
else
  ok 'Datos de ejemplo sin tocar (./setup.sh -y para recargarlos)'
fi

# ── Listo ────────────────────────────────────────────────────────────────────────────────
paso 'Entorno listo'
cat <<FIN
  npm run dev         → http://localhost:3000
  npm test            → tests unitarios y de integración
  npm run test:e2e    → tests e2e con Playwright (antes: npx playwright install chromium)
  docker compose down → para los servicios (los datos se conservan)
FIN
if [ "$POSTGRES_PORT$REDIS_PORT$S3_PORT" != '543263799090' ]; then
  echo "  Puertos no estándar: exporta POSTGRES_PORT=$POSTGRES_PORT REDIS_PORT=$REDIS_PORT S3_PORT=$S3_PORT antes de usar docker compose."
fi
