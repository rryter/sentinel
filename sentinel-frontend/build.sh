#!/bin/bash
set -e

# Configuration
REGISTRY="europe-west6-docker.pkg.dev"
PROJECT="twy-website-analytics"
REPOSITORY="docker-repo"
IMAGE_NAME="sentinel-frontend"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
TAG="latest"

# Image names
VERSION_TAG="${REGISTRY}/${PROJECT}/${REPOSITORY}/${IMAGE_NAME}:${TIMESTAMP}"
LATEST_TAG="${REGISTRY}/${PROJECT}/${REPOSITORY}/${IMAGE_NAME}:${TAG}"

echo "🏗️  Building production image..."
docker build --target production -t "${VERSION_TAG}" -t "${LATEST_TAG}" .

echo "⬆️  Pushing images to Google Artifact Registry..."
docker push "${VERSION_TAG}"
docker push "${LATEST_TAG}"

echo "✅ Build and push completed successfully!"
echo "Version tag: ${VERSION_TAG}"
echo "Latest tag: ${LATEST_TAG}"

echo "📝 Checking pod status..."
kubectl get pods -n scoper -l app=test-app -o=custom-columns=NAME:.metadata.name,IMAGE:.spec.containers[0].image,STATUS:.status.phase,AGE:.status.startTime

echo "💡 To force a pod restart and pull the latest image, run:"
echo "kubectl rollout restart deployment test-app -n scoper"
