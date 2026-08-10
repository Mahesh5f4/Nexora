#!/bin/bash
# =============================================================
# restore.sh — MySQL Database Restore Script
# =============================================================
# Usage:
#   ./scripts/restore.sh ./backups/eventhub_backup_20260101_120000.sql
#
# WARNING: This OVERWRITES the current database. Use with caution.
# =============================================================

set -euo pipefail

BACKUP_FILE=${1:?Usage: ./scripts/restore.sh <path-to-backup.sql>}

# Load environment variables
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

CONTAINER="eventhub-mysql"
DB="${MYSQL_DATABASE:-ticketbooking}"

# Validate backup file
if [ ! -f "${BACKUP_FILE}" ]; then
  echo "ERROR: Backup file not found: ${BACKUP_FILE}"
  exit 1
fi

# Check container is running
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER}$"; then
  echo "ERROR: Container '${CONTAINER}' is not running."
  exit 1
fi

echo "===========================================================" 
echo "  WARNING: This will OVERWRITE the database '${DB}'"
echo "  Backup file: ${BACKUP_FILE}"
echo "==========================================================="
read -p "  Are you sure? Type 'yes' to confirm: " CONFIRM

if [ "${CONFIRM}" != "yes" ]; then
  echo "Restore cancelled."
  exit 0
fi

echo "==> Restoring database from: ${BACKUP_FILE}"

# Pipe the backup file into mysql inside the container
docker exec -i "${CONTAINER}" \
  mysql \
    -u root \
    --password="${MYSQL_ROOT_PASSWORD}" \
  < "${BACKUP_FILE}"

echo "==> Restore complete! Database '${DB}' has been restored."
echo "==> You may need to restart Spring Boot services:"
echo "    docker compose restart auth-service event-service booking-service"
