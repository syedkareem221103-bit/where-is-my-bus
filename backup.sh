#!/bin/bash
# backup.sh
# Dumps the PostgreSQL database and copies to S3/external storage.

set -e

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="backup_${TIMESTAMP}.sql"
CONTAINER_NAME="where-is-my-bus_db_1"

echo "Starting database backup..."
docker exec -t $CONTAINER_NAME pg_dumpall -c -U ${POSTGRES_USER:-wimb_prod_user} > /tmp/$BACKUP_FILE

echo "Backup created at /tmp/$BACKUP_FILE"
# Optional: gzip /tmp/$BACKUP_FILE
# Optional: aws s3 cp /tmp/${BACKUP_FILE}.gz s3://your-backup-bucket/
