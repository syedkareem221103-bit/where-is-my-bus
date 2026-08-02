#!/bin/bash
# rollback.sh
# Rollback script to a previous image tag

set -e

if [ -z "$1" ]; then
  echo "Usage: $0 <previous_image_tag>"
  exit 1
fi

PREVIOUS_TAG=$1

echo "Initiating rollback to tag: $PREVIOUS_TAG"

# Assuming the docker-compose file uses an environment variable for the tag, or sed is used.
# For simplicity, if we have a tagged image we can just force the backend to use it.
echo "Manually forcing backend to $PREVIOUS_TAG (This requires docker-compose modification or TAG variable support)"
export IMAGE_TAG=$PREVIOUS_TAG
docker-compose -f docker-compose.prod.yml up -d

echo "Rollback initiated. Please run verify.sh"
