#!/bin/bash
# deploy.sh
# Production Deployment Script

set -e

IMAGE_TAG=${1:-"v1.0.0"}

echo "Starting Deployment for tag: $IMAGE_TAG"

# Ensure environment variables are loaded
if [ ! -f ".env.production" ]; then
    echo "ERROR: .env.production is missing!"
    exit 1
fi

# Pull the latest image
docker-compose -f docker-compose.prod.yml pull

# Start services
docker-compose -f docker-compose.prod.yml up -d

echo "Deployment completed successfully."
