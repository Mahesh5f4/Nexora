#!/bin/bash
set -e

echo "Purging old Docker installations..."
sudo apt-get purge -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin docker-ce-rootless-extras docker.io docker-doc docker-compose docker-compose-v2 podman-docker containerd runc || true
sudo apt-get autoremove -y --purge

echo "Removing leftover files..."
sudo rm -rf /var/lib/docker
sudo rm -rf /var/lib/containerd
sudo rm -rf /etc/docker

echo "Installing Docker using official script..."
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

echo "Enabling Docker service..."
sudo systemctl enable --now docker.service
sudo systemctl enable --now docker.socket

echo "Adding user to docker group..."
sudo usermod -aG docker ubuntu

echo "Checking Docker status..."
sudo docker --version
sudo docker compose version

echo "Building and starting Docker Compose..."
cd /home/ubuntu/event-management-system/backend
sudo docker compose build
sudo docker compose up -d

echo "Deployment completed successfully!"
