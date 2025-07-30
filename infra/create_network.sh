#!bin/bash

NETWORK_NAME="sitehaus-prod-network"

if ! docker network inspect "$NETWORK_NAME" > /dev/null 2>&1; then
    echo "Network '$NETWORK_NAME' not found. Creating it..."
    docker network create "$NETWORK_NAME"
else
    echo "network '$NETWORK_NAME' already exists."
fi
