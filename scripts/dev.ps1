# Levanta Conecta Empleo completo en local: Postgres (Docker), backend (uvicorn)
# y frontend (vite) en dos ventanas nuevas de PowerShell. No corre migraciones
# ni semillas -- eso es manual la primera vez (ver README.md raíz) porque
# fallar a medias en un `docker compose up` o una migración pendiente es más
# fácil de diagnosticar por separado que dentro de un script todo-en-uno.
#
# Uso: desde la raíz del repo, `./scripts/dev.ps1`
#
# IMPORTANTE (ver README.md raíz): esta máquina puede tener una variable
# DATABASE_URL global de otro proyecto que pydantic-settings prioriza sobre
# `backend/.env`. Este script la fija explícitamente para el proceso del
# backend, pero si abres tu propia terminal para `alembic`/`pytest`/seeds,
# expórtala tú también.

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot

Write-Host "== Conecta Empleo · dev ==" -ForegroundColor Cyan

Write-Host "-- Postgres (docker compose, puerto 5433) --" -ForegroundColor Cyan
Push-Location (Join-Path $root "backend")
docker compose up -d
Pop-Location

$databaseUrl = "postgresql+psycopg://conecta:conecta@localhost:5433/conecta"

Write-Host "-- Backend: uvicorn en :8000 (ventana nueva) --" -ForegroundColor Cyan
$backendCmd = "cd `"$root\backend`"; `$env:DATABASE_URL='$databaseUrl'; .venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $backendCmd

Write-Host "-- Frontend: vite en :5173 (ventana nueva) --" -ForegroundColor Cyan
$frontendCmd = "cd `"$root\frontend`"; npm run dev"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $frontendCmd

Write-Host ""
Write-Host "Backend:  http://localhost:8000/health" -ForegroundColor Green
Write-Host "Frontend: http://localhost:5173" -ForegroundColor Green
Write-Host ""
Write-Host "Si es la primera vez, corre antes (una sola terminal, backend/):" -ForegroundColor Yellow
Write-Host '  $env:DATABASE_URL="postgresql+psycopg://conecta:conecta@localhost:5433/conecta"'
Write-Host "  .venv\Scripts\python.exe -m alembic upgrade head"
Write-Host "  .venv\Scripts\python.exe -m app.seeds.run"
Write-Host "  .venv\Scripts\python.exe -m app.seeds.demo"
