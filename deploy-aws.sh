#!/bin/bash

# FMAE-TMS - AWS EC2 Deployment Script (Linux)
echo "🚀 FMAE-TMS - Production Deployment"
echo "----------------------------------------"

# 1. Environment Check
if ! [ -x "$(command -v docker)" ]; then
  echo "❌ Error: Docker is not installed. Please install Docker first."
  exit 1
fi

if ! [ -x "$(command -v docker-compose)" ]; then
  echo "❌ Error: Docker-compose is not installed."
  exit 1
fi

# 2. Get Public IP or Domain
PUBLIC_IP=$(curl -s http://checkip.amazonaws.com)
echo "🌐 Detected Public IP: $PUBLIC_IP"

# 3. Configure .env.docker for AWS
echo "⚙️  Syncing environment variables..."
if [ -f "backend/.env" ]; then
  cp backend/.env backend/.env.docker
  
  # Update for AWS (Using the Public IP)
  sed -i "s|DB_HOST=.*|DB_HOST=db|g" backend/.env.docker
  sed -i "s|DB_PASSWORD=.*|DB_PASSWORD=Admin@FMAE2026|g" backend/.env.docker
  sed -i "s|FRONTEND_URL=.*|FRONTEND_URL=http://$PUBLIC_IP|g" backend/.env.docker
  sed -i "s|SOCKET_CORS=.*|SOCKET_CORS=http://$PUBLIC_IP|g" backend/.env.docker
else
  echo "⚠️ Warning: backend/.env not found. Please ensure it exists."
fi

# 4. Clean up old data if requested
read -p "Do you want to RESET ALL DATA (Wipe Database)? (y/n): " clearData
if [ "$clearData" == "y" ]; then
  echo "🧹 Cleaning up old volumes..."
  docker-compose -p fmae-tms-production down -v --remove-orphans
  docker volume rm fmae-tms-production_fmae_postgres_data_prod 2>/dev/null
fi

# 5. Launch with Docker Compose
echo "📦 Building and starting containers..."
docker-compose -p fmae-tms-production up --build -d

echo ""
echo "✅ AWS Deployment Complete!"
echo "----------------------------------------"
echo "URL: http://$PUBLIC_IP"
echo "----------------------------------------"
echo "Note: Ensure Port 80 and 5000 are open in your AWS Security Group."
