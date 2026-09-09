#!/usr/bin/env bash
# Gemelo Bash de dev.ps1: levanta Postgres (Docker), backend (uvicorn) y
# frontend (vite) en local. No corre migraciones ni semillas (ver README.md
# raíz) -- solo la primera vez, a mano, para poder diagnosticar cada paso por
# separado.
#
# Uso: desde la raíz del repo, `bash scripts/dev.sh`
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export DATABASE_URL="postgresql+psycopg://conecta:conecta@localhost:5433/conecta"

echo "== Conecta Empleo · dev =="

echo "-- Postgres (docker compose, puerto 5433) --"
(cd "$ROOT_DIR/backend" && docker compose up -d)

echo "-- Backend: uvicorn en :8000 (background, log en /tmp/conecta-backend.log) --"
(
  cd "$ROOT_DIR/backend"
  DATABASE_URL="$DATABASE_URL" nohup .venv/Scripts/python.exe -m uvicorn app.main:app --reload --port 8000 \
    > /tmp/conecta-backend.log 2>&1 &
  echo "backend pid: $!"
)

echo "-- Frontend: vite en :5173 (background, log en /tmp/conecta-frontend.log) --"
(
  cd "$ROOT_DIR/frontend"
  nohup npm run dev > /tmp/conecta-frontend.log 2>&1 &
  echo "frontend pid: $!"
)

cat <<'EOF'

Backend:  http://localhost:8000/health
Frontend: http://localhost:5173

Si es la primera vez, corre antes (una sola terminal, backend/):
  export DATABASE_URL="postgresql+psycopg://conecta:conecta@localhost:5433/conecta"
  .venv/Scripts/python.exe -m alembic upgrade head
  .venv/Scripts/python.exe -m app.seeds.run
  .venv/Scripts/python.exe -m app.seeds.demo

Para detener: mata los procesos de uvicorn/vite (los PIDs se imprimieron arriba).
EOF
