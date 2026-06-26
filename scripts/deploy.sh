#!/bin/bash
set -e

cd /home/ubuntu/www/html/allfamilytree.com

# Source the variables created during build
if [ -f deploy.env ]; then
    source deploy.env
fi

echo "Stopping existing containers..."
docker compose --env-file .env.production down

echo "Deploying image: $REPOSITORY_URI:$IMAGE_TAG"

echo "Logging into ECR..."
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $REPOSITORY_URI

echo "Updating docker-compose env..."
if [ ! -f .env.production ]; then
  touch .env.production
fi

if grep -q "^IMAGE_URI=" .env.production; then
  sed -i "s|^IMAGE_URI=.*|IMAGE_URI=$REPOSITORY_URI:$IMAGE_TAG|" .env.production
else
  echo "IMAGE_URI=$REPOSITORY_URI:$IMAGE_TAG" >> .env.production
fi

if grep -q "^APP_VERSION=" .env.production; then
  sed -i "s|^APP_VERSION=.*|APP_VERSION=$IMAGE_TAG|" .env.production
else
  echo "APP_VERSION=$IMAGE_TAG" >> .env.production
fi

echo "Starting containers..."
docker compose --env-file .env.production up -d

docker image prune -a -f

echo "Deployment completed successfully 🚀"