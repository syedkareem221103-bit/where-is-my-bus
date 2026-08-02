#!/bin/bash
# restore.sh
# Restores the PostgreSQL database from a given SQL dump.

set -e

if [ -z "$1" ]; then
  echo "Usage: $0 <backup_file.sql>"
  exit 1
fi

BACKUP_FILE=$1
CONTAINER_NAME="where-is-my-bus_db_1"

echo "Restoring database from $BACKUP_FILE..."
cat $BACKUP_FILE | docker exec -i $CONTAINER_NAME psql -U ${POSTGRES_USER:-wimb_prod_user}
echo "Restore complete."
