#!/bin/bash
# =============================================================
# auto-backup.sh — Automated Nightly Database Backup
# =============================================================
# Schedule this with cron for automatic nightly backups.
#
# Setup (run on EC2):
#   chmod +x scripts/auto-backup.sh
#   crontab -e
#
#   Add this line for 2 AM nightly backup:
#   0 2 * * * cd /home/ubuntu/event/backend && ./scripts/auto-backup.sh >> /var/log/eventhub-backup.log 2>&1
#
# Logs are written to: /var/log/eventhub-backup.log
# =============================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "${SCRIPT_DIR}")"

cd "${PROJECT_DIR}"

# Load environment variables
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="eventhub_backup_${TIMESTAMP}.sql"
CONTAINER="eventhub-mysql"
DB="${MYSQL_DATABASE:-ticketbooking}"
BACKUP_DIR="${PROJECT_DIR}/backups"
LOG_PREFIX="[$(date '+%Y-%m-%d %H:%M:%S')] [auto-backup]"

mkdir -p "${BACKUP_DIR}"

echo "${LOG_PREFIX} Starting nightly backup of '${DB}'..."

# Check MySQL container is running
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER}$"; then
  echo "${LOG_PREFIX} ERROR: Container '${CONTAINER}' not running. Backup FAILED."
  exit 1
fi

# Run the backup
docker exec "${CONTAINER}" \
  mysqldump \
    -u root \
    --password="${MYSQL_ROOT_PASSWORD}" \
    --single-transaction \
    --routines \
    --triggers \
    --databases "${DB}" \
  > "${BACKUP_DIR}/${BACKUP_FILE}"

BACKUP_SIZE=$(du -sh "${BACKUP_DIR}/${BACKUP_FILE}" | cut -f1)
echo "${LOG_PREFIX} Backup complete: ${BACKUP_FILE} (${BACKUP_SIZE})"

# Retain only the last 14 backups (2 weeks)
DELETED=$(ls -t "${BACKUP_DIR}"/eventhub_backup_*.sql 2>/dev/null | tail -n +15)
if [ -n "${DELETED}" ]; then
  echo "${DELETED}" | xargs rm -f
  echo "${LOG_PREFIX} Pruned old backups (keeping last 14)."
fi

echo "${LOG_PREFIX} Auto-backup complete."
