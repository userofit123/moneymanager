#!/bin/sh
# Backup of the database and documents. Run from the project folder (cron: 30 2 * * * /path/backup.sh).
#   BACKUP_DIR   where dumps go (default ./backups)
#   BACKUP_DEST  optional rsync target, e.g. dell:/backups/finance (same pattern as the Immich backup)
# The encryption key (app.key) is deliberately NOT included: keep it in your password manager
# (docker compose exec app cat /data/app.key). Without it a restore works, but you re-enter the bank logins.
set -eu
cd "$(dirname "$0")"
DIR="${BACKUP_DIR:-./backups}"; mkdir -p "$DIR"; umask 077
STAMP=$(date +%F)
docker compose exec -T db pg_dump -U money money | gzip > "$DIR/db-$STAMP.sql.gz"
docker compose exec -T app tar -C /data -c documents 2>/dev/null | gzip > "$DIR/documents-$STAMP.tar.gz" || true
find "$DIR" -name 'db-*.sql.gz' -mtime +14 -delete
find "$DIR" -name 'documents-*.tar.gz' -mtime +14 -delete
[ -n "${BACKUP_DEST:-}" ] && rsync -a "$DIR/" "$BACKUP_DEST/"
echo "Backup written to $DIR"
