#!/bin/bash
# =============================================================
# backup.sh — MySQL Database Backup Script
# =============================================================
# Usage:
#   ./scripts/backup.sh
#
# Creates a timestamped SQL dump in the 'backups' Docker volume.
# To copy backup to host:
#   docker cp eventhub-mysql:/backups/<filename> .
# =============================================================

set -euo pipefail

# Load environment variables
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="eventhub_backup_${TIMESTAMP}.sql"
CONTAINER="eventhub-mysql"
DB="${MYSQL_DATABASE:-ticketbooking}"

echo "==> Starting backup of database '${DB}'..."
echo "    Timestamp: ${TIMESTAMP}"
echo "    Container: ${CONTAINER}"

# Check container is running
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER}$"; then
  echo "ERROR: Container '${CONTAINER}' is not running."
  exit 1
fi

# Create backup directory inside container
docker exec "${CONTAINER}" mkdir -p /backups

# Run mysqldump inside the container
docker exec "${CONTAINER}" \
  mysqldump \
    -u root \
    --password="${MYSQL_ROOT_PASSWORD}" \
    --single-transaction \
    --routines \
    --triggers \
    --databases "${DB}" \
  > "./backups/${BACKUP_FILE}"

BACKUP_SIZE=$(du -sh "./backups/${BACKUP_FILE}" | cut -f1)

echo "==> Backup complete!"
echo "    File:  ./backups/${BACKUP_FILE}"
echo "    Size:  ${BACKUP_SIZE}"

# Keep only the last 7 backups
echo "==> Cleaning up old backups (keeping last 7)..."
ls -t ./backups/eventhub_backup_*.sql 2>/dev/null | tail -n +8 | xargs rm -f

echo "==> Done."
