#!/bin/bash
# db-rollback.sh
# Safely reverses Prisma migrations in an emergency scenario.

set -e

echo "Starting Database Migration Rollback..."

# WARNING: Prisma 'migrate reset' drops all data.
# In a true production environment, we do not use 'reset'.
# We apply a down-migration SQL script manually, or restore from snapshot.

echo "Reverting to previous database snapshot..."
LATEST_BACKUP=$(ls -t /tmp/backup_*.sql | head -n 1)

if [ -z "$LATEST_BACKUP" ]; then
    echo "ERROR: No backup found in /tmp. Cannot proceed with automated rollback."
    exit 1
fi

echo "Found snapshot: $LATEST_BACKUP. Executing restore..."
./restore.sh $LATEST_BACKUP

echo "Database rollback complete. Please run scripts/verify.sh."
