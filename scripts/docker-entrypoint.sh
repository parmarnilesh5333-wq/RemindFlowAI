#!/bin/sh
set -e

echo "============================================================"
echo " RemindFlow AI - Production Container Entrypoint"
echo "============================================================"

# Select PostgreSQL schema for cloud DBs or SQLite schema for local/mounted DBs
case "$DATABASE_URL" in
  postgres://*|postgresql://*|prisma+postgres://*)
    SCHEMA_FLAG="--schema=prisma/schema.postgres.prisma"
    echo "Database Mode: Cloud PostgreSQL"
    ;;
  *)
    SCHEMA_FLAG="--schema=prisma/schema.prisma"
    mkdir -p /data
    echo "Database Mode: Local SQLite"
    ;;
esac

echo "[1/3] Synchronizing Prisma client and schema (non-destructive)..."
npx prisma generate $SCHEMA_FLAG
npx prisma db push $SCHEMA_FLAG --skip-generate

echo "[2/3] Starting background scheduler worker..."
node scripts/worker.mjs &

echo "[3/3] Starting RemindFlow AI Next.js production server on port ${PORT:-3000}..."
exec npx next start -H 0.0.0.0 -p "${PORT:-3000}"
