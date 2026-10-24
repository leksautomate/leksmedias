#!/usr/bin/env bash
# Nightly database backup. Add to cron, e.g.:  15 3 * * *  /path/to/leksmedias/scripts/backup.sh
# Keeps BACKUP_KEEP_DAYS days (default 14). Copy ./backups off the server too (rsync, rclone, another disk).
set -euo pipefail
cd "$(dirname "$0")/.."
set -a; [ -f .env ] && . ./.env; set +a
mkdir -p backups
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
out="backups/leks-${stamp}.dump"
docker compose exec -T db pg_dump -U "${POSTGRES_USER:-leks}" -d "${POSTGRES_DB:-leks}" -Fc > "${out}.tmp"
mv "${out}.tmp" "${out}"
find backups -name 'leks-*.dump' -mtime +"${BACKUP_KEEP_DAYS:-14}" -delete
echo "backup written: ${out} ($(du -h "${out}" | cut -f1))"
