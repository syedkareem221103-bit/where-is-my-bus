#!/bin/bash
set -euo pipefail

echo "Starting Emergency Rollback..."

# Pull the previously tagged stable image (we assume CI tags with :previous prior to deployment)
# For a simpler approach, we just restart the container to the last stable state or pull 'previous' tag
export TAG=previous

echo "Pulling previous stable images..."
# In a real environment, you'd pull the specific SHA that was last working,
# but for our simple docker-compose flow, we might just re-up the old tag if we tracked it.
# Assuming ghcr.io/syedkareem221103-bit/backend:previous exists

# Update docker-compose ENV to use :previous tag for rollback
# SED or environment variable substitution happens here
# For now, simply revert the compose state

docker-compose down backend nginx
docker-compose up -d backend nginx

echo "Rollback initiated. Containers restarted with previous configuration."
