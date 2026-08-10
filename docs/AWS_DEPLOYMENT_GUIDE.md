# EventHub — AWS EC2 Deployment Guide
## Docker Compose on Ubuntu EC2 (Single Instance)

---

## Prerequisites

- AWS Account with EC2 access
- A GitHub repository with your EventHub code
- (Optional) A domain name for HTTPS

---

## Step 1 — Launch EC2 Instance

### Instance Configuration

| Parameter | Value |
|---|---|
| **AMI** | Ubuntu Server 22.04 LTS (64-bit x86) |
| **Instance Type** | `t3.small` (2 vCPU, 2 GB RAM) — start here, scale if needed |
| **Storage** | 30 GB gp3 EBS (fast, low cost) |
| **Key Pair** | Create or use existing `.pem` key |

### Security Group Rules

**Create a Security Group named `eventhub-sg` with these INBOUND rules:**

| Type | Port | Source | Reason |
|---|---|---|---|
| SSH | 22 | Your IP only (`x.x.x.x/32`) | Secure admin access |
| HTTP | 80 | `0.0.0.0/0` | Public web traffic |
| HTTPS | 443 | `0.0.0.0/0` | Secure web traffic (future) |

> **IMPORTANT**: Do NOT open ports 3306, 6379, 5672, 8080, 8081, 8082, 8083.
> All services communicate internally via Docker networking.

---

## Step 2 — Allocate an Elastic IP

1. In the EC2 console, go to **Elastic IPs** → **Allocate Elastic IP address**
2. Click **Allocate**
3. Select the new IP → **Actions** → **Associate Elastic IP address**
4. Select your EC2 instance → **Associate**

This gives you a **static IP** that survives instance restarts.

> Note your Elastic IP — you'll need it to SSH in and (optionally) configure DNS.

---

## Step 3 — Connect to Your Instance

```bash
# Set correct permissions on your key file
chmod 400 your-key.pem

# Connect via SSH
ssh -i your-key.pem ubuntu@<YOUR-ELASTIC-IP>
```

---

## Step 4 — Install Docker Engine & Docker Compose v2

Run these commands on your EC2 instance:

```bash
# Update package list
sudo apt-get update

# Install prerequisites
sudo apt-get install -y ca-certificates curl gnupg lsb-release

# Add Docker's official GPG key
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
  sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# Add Docker repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine + Compose plugin
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io \
  docker-buildx-plugin docker-compose-plugin

# Add ubuntu user to docker group (avoid sudo on every docker command)
sudo usermod -aG docker ubuntu

# Apply group change (or log out and back in)
newgrp docker

# Verify installation
docker --version
docker compose version
```

---

## Step 5 — Clone Your Repository

```bash
# Install Git
sudo apt-get install -y git

# Clone your repository
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git
cd YOUR_REPO
```

---

## Step 6 — Set Up Environment Variables

```bash
# Navigate to backend directory
cd backend

# Copy the production env template
cp .env.production .env

# Edit with your actual values
nano .env
```

**Key values to update in `.env`:**

```bash
# ⚠️ CHANGE THESE — don't use the placeholder values:
MYSQL_ROOT_PASSWORD=<strong-password>
SPRING_DATASOURCE_PASSWORD=<same-as-above>
RABBITMQ_PASSWORD=<strong-password>
SPRING_RABBITMQ_PASSWORD=<same-as-above>
GF_ADMIN_PASSWORD=<strong-password>

# Set your frontend domain for CORS (if you have one):
ALLOWED_ORIGINS=https://your-frontend-domain.com
```

---

## Step 7 — Create Required Directories

```bash
# From the backend/ directory
mkdir -p certbot/conf certbot/www backups

# Make scripts executable
chmod +x scripts/backup.sh scripts/restore.sh scripts/auto-backup.sh init-letsencrypt.sh
```

---

## Step 8 — Build and Start All Services

```bash
# Build all Docker images (this takes 5-10 minutes on first run)
docker compose build

# Start all services in detached mode
docker compose up -d

# Monitor startup (boot sequence takes 2-3 minutes due to health checks)
docker compose ps
```

**Expected startup sequence:**
```
mysql       → healthy (30s)
redis       → healthy (10s)
rabbitmq    → healthy (30s)
ml-service  → healthy (20s)
auth-service    → healthy (90s)
event-service   → healthy (90s)
booking-service → healthy (90s)
gateway-service → healthy (60s)
nginx           → healthy
```

---

## Step 9 — Verify Everything is Running

```bash
# Check all containers are healthy
docker compose ps

# Test the API gateway through Nginx
curl http://localhost/actuator/health
# Or via the public IP:
curl http://<YOUR-ELASTIC-IP>/health

# View logs if something is wrong
docker compose logs -f auth-service
docker compose logs -f gateway-service
```

---

## Step 10 — Set Up Nightly Database Backups

```bash
# Install the backup cron job (backs up at 2 AM every night)
make setup-backup-cron

# Verify it was installed
crontab -l
```

Backups are saved to `backend/backups/` and kept for 14 days.

---

## Step 11 (Optional) — Configure Domain + HTTPS

### DNS Configuration

In your domain registrar's DNS settings:

| Type | Name | Value |
|---|---|---|
| A | `@` or `api` | Your Elastic IP |
| CNAME | `www` | Your root domain |

Wait for DNS propagation (up to 48 hours, usually 5-30 minutes).

### Enable HTTPS with Let's Encrypt

```bash
# Run this AFTER DNS has propagated
./init-letsencrypt.sh yourdomain.com your@email.com

# Verify HTTPS works
curl https://yourdomain.com/health
```

### Set Up Certificate Auto-Renewal

```bash
# Add to crontab (renews certificate every 60 days automatically)
crontab -e

# Add this line:
0 0 1 * * cd /home/ubuntu/YOUR_REPO/backend && docker run --rm \
  -v $(pwd)/certbot/conf:/etc/letsencrypt \
  -v $(pwd)/certbot/www:/var/www/certbot \
  certbot/certbot:latest renew --quiet && docker compose restart nginx
```

---

## Monitoring (Internal Access via SSH Tunnel)

Prometheus and Grafana are **internal only** (not internet-facing). Access via SSH tunnel:

```bash
# Run this on your LOCAL machine:
ssh -L 3000:grafana:3000 -L 9090:prometheus:9090 -i your-key.pem ubuntu@<YOUR-EC2-IP>

# Then open in your browser:
# http://localhost:3000 → Grafana  (admin / your GF_ADMIN_PASSWORD)
# http://localhost:9090 → Prometheus
```

---

## Common Operations

```bash
# View all container status
make status

# Tail all logs
make logs

# Tail a specific service
make logs-auth
make logs-booking
make logs-nginx

# Restart a single service
docker compose restart auth-service

# Pull latest code and redeploy
make update

# Manual database backup
make backup

# Restore from backup
make restore FILE=./backups/eventhub_backup_20260101_120000.sql

# Open MySQL shell
make mysql-shell

# Open Redis CLI
make redis-shell
```

---

## Troubleshooting

### Container won't start / keeps restarting

```bash
# Check container logs
docker compose logs auth-service

# Check events for crash reason
docker events --filter container=eventhub-auth-service
```

### Health check failing

```bash
# Test health endpoint manually
docker exec eventhub-auth-service wget -q -O - http://localhost:8081/api/actuator/health

# Check database connectivity
docker exec eventhub-mysql mysqladmin ping -u root -p
```

### Out of disk space

```bash
# Check disk usage
df -h

# Clean Docker artifacts
docker system prune -f

# Check log sizes
du -sh /var/lib/docker/containers/*/
```

### Out of memory (t3.small has 2GB RAM)

```bash
# Check memory usage
free -h
docker stats --no-stream

# Reduce Hikari pool sizes in application.yml if needed
# maximum-pool-size: 20 (instead of 50)
```

---

## Cost Estimate (AWS)

| Resource | Approximate Monthly Cost |
|---|---|
| t3.small EC2 | ~$15 |
| 30 GB gp3 EBS | ~$2.40 |
| Elastic IP (associated) | Free |
| Data transfer (10GB out) | ~$0.90 |
| **Total** | **~$18/month** |

> t3.small uses burstable CPU credits. For sustained high traffic, upgrade to t3.medium (~$30/month).
