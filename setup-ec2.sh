#!/bin/bash
set -e

echo "Updating packages..."
sudo apt-get update

echo "Installing prerequisites..."
sudo apt-get install -y ca-certificates curl gnupg lsb-release git

echo "Adding Docker GPG key..."
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor --yes -o /etc/apt/keyrings/docker.gpg

echo "Adding Docker repository..."
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

echo "Removing conflicting packages..."
sudo apt-get --fix-broken install -y
sudo apt-get remove -y docker.io docker-doc docker-compose docker-compose-v2 podman-docker containerd runc || true

echo "Installing Docker..."
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

echo "Starting Docker service..."
sudo systemctl daemon-reload || true
sudo systemctl enable docker || true
sudo systemctl restart docker || true

echo "Adding user to docker group..."
sudo usermod -aG docker ubuntu

echo "Cloning repository..."
if [ ! -d "event-management-system" ]; then
  git clone https://github.com/Mahesh5f4/event-management-system.git
else
  echo "Repository already cloned, pulling latest..."
  cd event-management-system
  git pull
  cd ..
fi

echo "Setting up environment..."
cd event-management-system/backend
if [ ! -f .env ]; then
  if [ -f .env.production ]; then
    cp .env.production .env
  elif [ -f .env.example ]; then
    cp .env.example .env
  fi
fi

echo "Building and starting Docker Compose..."
sudo docker compose build
sudo docker compose up -d

echo "Deployment completed successfully!"
