#!/bin/sh
# Build de Vercel (npm run vercel-build, que Vercel ejecuta en lugar de `build` si existe).
# Aplica las migraciones pendientes ANTES de compilar: si una migración falla, el build falla
# y Vercel no publica la versión nueva, así que nunca hay código nuevo sobre un esquema viejo.
# - production: migra la BD de producción.
# - preview: migra la BD de la preview (una rama de Neon por preview o una BD aparte), nunca
#   la de producción, porque DATABASE_URL de preview apunta a otra BD.
# `prisma migrate deploy` solo aplica migraciones ya creadas (no genera ni resetea nada) y usa
# DIRECT_URL si existe (ver prisma.config.ts).
set -eu

if [ -z "${DATABASE_URL:-}" ]; then
  echo "Falta DATABASE_URL en el entorno ${VERCEL_ENV:-desconocido} de Vercel" >&2
  exit 1
fi

echo "Aplicando migraciones (entorno ${VERCEL_ENV:-desconocido})..."
prisma migrate deploy
next build
