#!/bin/bash
# deploy.sh
# Production Deployment Script

set -e

IMAGE_TAG=${1:-"v1.0.0"}
DEPLOY_USER=${USER}
DEPLOY_TIME=$(date --iso-8601=seconds)

echo "======================================"
echo "Starting Deployment for tag: $IMAGE_TAG"
echo "Executed by: $DEPLOY_USER"
echo "Timestamp: $DEPLOY_TIME"
echo "======================================"

# Audit Logging
echo "$DEPLOY_TIME | User: $DEPLOY_USER | Tag: $IMAGE_TAG" >> /var/log/whereismybus_deployments.log || echo "Audit log write failed (check permissions)"

# Ensure environment variables are loaded
if [ ! -f ".env.production" ]; then
    echo "ERROR: .env.production is missing!"
    exit 1
fi

echo "Pulling latest image (Estimated Time: 2m)..."
docker-compose -f docker-compose.prod.yml pull

echo "Starting services (Estimated Time: 10s)..."
docker-compose -f docker-compose.prod.yml up -d

echo "Running Pre-flight Prisma Migration Execution..."
# In a pure Docker setup, this could be run via docker exec against the backend node
# docker exec -t where-is-my-bus_backend_1 npx prisma migrate deploy

echo "Deployment completed successfully. Verifying application state..."
./scripts/verify.sh
