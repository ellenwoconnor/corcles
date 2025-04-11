#!/bin/bash

set -e  # Exit immediately if a command exits with a non-zero status

echo "🔐 Loading PostgreSQL CA certificate..."
export PG_CA_CERT="$(cat ca-certificate.crt)"

echo "🔑 Authenticating Docker with Fly.io..."
fly auth docker

echo "🐳 Building Docker image for corcles-app (no cache)..."
docker build \
  --no-cache \
  --build-arg PG_CA_CERT="$PG_CA_CERT" \
  -t corcles-app:latest . \
  --platform linux/amd64

echo "🏷️ Tagging image for Fly.io registry..."
docker tag corcles-app registry.fly.io/corcles:latest

echo "📤 Pushing image to Fly.io registry..."
docker push registry.fly.io/corcles:latest

echo "🚀 Deploying app with Fly.io..."
DOCKER_BUILDKIT=1 flyctl deploy

echo "✅ Deployment complete!"