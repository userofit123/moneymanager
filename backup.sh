#!/bin/sh
# Nightly backup of the database and documents to the old Dell server (same pattern as the Immich backup).
# cron: 30 2 * * * ~/docker/finance/backup.sh
set -eu
DEST="${BACKUP_DEST:-dell:/backups/finance}"
cd "$(dirname "$0")"
docker compose exec -T db pg_dump -U money money | gzip > /mnt/data/finance/db-$(date +%F).sql.gz
find /mnt/data/finance -name 'db-*.sql.gz' -mtime +14 -delete
rsync -a --delete /mnt/data/finance/documents/ "$DEST/documents/"
rsync -a /mnt/data/finance/db-*.sql.gz "$DEST/db/"
