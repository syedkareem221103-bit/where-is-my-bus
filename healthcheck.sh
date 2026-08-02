#!/bin/bash
# healthcheck.sh
# Validates core infrastructure endpoints

set -e

DOMAIN="https://localhost"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -k "$DOMAIN/health")

if [ "$HTTP_CODE" -eq 200 ]; then
    echo "Healthcheck passed. Backend API is up."
    exit 0
else
    echo "Healthcheck failed. Backend API returned $HTTP_CODE."
    exit 1
fi
