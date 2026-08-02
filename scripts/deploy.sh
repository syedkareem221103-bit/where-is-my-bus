#!/bin/bash
set -euo pipefail

echo "Starting Zero-Downtime Deployment..."

# Ensure we have latest images
docker-compose pull

# Run database migrations in a temporary container before swapping traffic
echo "Running Database Migrations..."
docker-compose run --rm backend npx prisma migrate deploy

# Start the new backend and frontend containers in the background, keeping old ones running
echo "Starting new containers..."
docker-compose up -d --no-deps --build backend nginx

# Wait for backend health check to pass
echo "Waiting for backend health check..."
ATTEMPTS=0
MAX_ATTEMPTS=12 # 60 seconds

while [ $ATTEMPTS -lt $MAX_ATTEMPTS ]; do
  HEALTH_STATUS=$(docker inspect --format='{{json .State.Health.Status}}' wimb_backend 2>/dev/null || echo '"unhealthy"')
  if [ "$HEALTH_STATUS" = "\"healthy\"" ]; then
    echo "Backend is healthy!"
    break
  fi
  echo "Backend is $HEALTH_STATUS. Waiting 5 seconds..."
  sleep 5
  ATTEMPTS=$((ATTEMPTS+1))
done

if [ $ATTEMPTS -eq $MAX_ATTEMPTS ]; then
  echo "CRITICAL: Backend failed to become healthy in time. Triggering rollback."
  bash scripts/rollback.sh
  exit 1
fi

# Reload Nginx config to point to the new backend process
echo "Reloading Nginx..."
docker exec wimb_nginx nginx -s reload || true

echo "Deployment Successful!"
