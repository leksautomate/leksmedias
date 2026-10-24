#!/usr/bin/env bash
# Restore a backup into the running database. DESTRUCTIVE: replaces existing tables.
# Usage: scripts/restore.sh backups/leks-20261024T031500Z.dump
set -euo pipefail
cd "$(dirname "$0")/.."
[ $# -eq 1 ] && [ -f "$1" ] || { echo "usage: $0 <backup.dump>"; exit 1; }
set -a; [ -f .env ] && . ./.env; set +a
read -r -p "This replaces data in ${POSTGRES_DB:-leks}. Type 'restore' to continue: " ok
[ "$ok" = "restore" ] || { echo "aborted"; exit 1; }
docker compose stop web worker
docker compose exec -T db pg_restore -U "${POSTGRES_USER:-leks}" -d "${POSTGRES_DB:-leks}" --clean --if-exists --no-owner < "$1"
docker compose start web worker
echo "restored from $1"
