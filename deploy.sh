#!/bin/bash
set -e

REGISTRY="iad.ocir.io/idd2oizp8xvc"
IMAGE_NAME="blueblocks-xyz"
TAG="${1:-latest}"

echo "=== Building Docker image ==="
docker build -t ${IMAGE_NAME}:${TAG} .

echo "=== Tagging for OCI Registry ==="
docker tag ${IMAGE_NAME}:${TAG} ${REGISTRY}/${IMAGE_NAME}:${TAG}

echo "=== Pushing to OCI Registry ==="
docker push ${REGISTRY}/${IMAGE_NAME}:${TAG}

echo "=== Switching kubectl context ==="
kubectl config use-context context-cx2e6j6lita

echo "=== Deploying to Kubernetes ==="
kubectl apply -f k8s/

echo "=== Restarting deployment to pull latest image ==="
kubectl -n consumer-sites rollout restart deployment/blueblocks-xyz 2>/dev/null || true

echo "=== Done! ==="
echo "Site will be available at https://blueblocks.xyz once DNS propagates"
echo ""
echo "Check deployment status:"
echo "  kubectl -n consumer-sites get pods -l app=blueblocks-xyz"
echo "  kubectl -n consumer-sites get ingress blueblocks-xyz"
