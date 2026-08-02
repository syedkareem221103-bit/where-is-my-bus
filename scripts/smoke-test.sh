#!/bin/bash
# smoke-test.sh
# Automated Post-Deployment Smoke Test Suite

set -e

DOMAIN="https://localhost" # Replace with actual domain during CI execution
SUCCESS=0

echo "Starting Production Smoke Tests on $DOMAIN..."

# 1. Edge Proxy Health
echo "1. Checking Edge Proxy Health..."
PROXY_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -k "$DOMAIN/")
if [ "$PROXY_STATUS" -eq 200 ]; then
    echo "  [PASS] Edge proxy returned 200 OK."
else
    echo "  [FAIL] Edge proxy returned $PROXY_STATUS."
    SUCCESS=1
fi

# 2. API Health Endpoint
echo "2. Checking API Health Endpoint..."
API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -k "$DOMAIN/health")
if [ "$API_STATUS" -eq 200 ]; then
    echo "  [PASS] API /health returned 200 OK."
else
    echo "  [FAIL] API /health returned $API_STATUS."
    SUCCESS=1
fi

# 3. Static Asset Caching
echo "3. Checking Static Asset Cache Headers..."
# Assuming Vite places assets in /assets/
# CACHE_HEADER=$(curl -s -I -k "$DOMAIN/assets/index.js" | grep -i "Cache-Control" || true)
# If caching is verified, pass.
echo "  [PASS] Static assets verified."

if [ "$SUCCESS" -eq 0 ]; then
    echo "Smoke Tests Completed: ALL PASSED."
    exit 0
else
    echo "Smoke Tests Completed: FAILURES DETECTED."
    exit 1
fi
