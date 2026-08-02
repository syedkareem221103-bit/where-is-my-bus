#!/bin/bash
# verify.sh
# Verifies infrastructure status after deployment or rollback

set -e

echo "Verifying running containers..."
docker ps | grep where-is-my-bus

echo "Verifying backend health..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -k "http://localhost/health")

if [ "$HTTP_CODE" -eq 200 ]; then
    echo "Backend is HEALTHY."
else
    echo "Backend is UNHEALTHY! Status: $HTTP_CODE"
    exit 1
fi

echo "Verification Complete."
