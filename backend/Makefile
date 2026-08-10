# =============================================================
# EventHub — Operations Makefile
# =============================================================
# Usage (on EC2 Ubuntu):
#   make build       Build all Docker images
#   make start       Start all services
#   make stop        Stop all services
#   make restart     Restart all services
#   make status      Show container health status
#   make logs        Tail logs from all services
#   make update      Pull latest code and redeploy
#   make backup      Backup the database
#   make restore     Restore database from backup file
#   make clean       Remove stopped containers and dangling images
# =============================================================

COMPOSE = docker compose
ENV_FILE = .env

.PHONY: all build start stop restart status logs update backup restore clean \
        logs-auth logs-event logs-booking logs-gateway logs-nginx

# ─── Core Commands ────────────────────────────────────────────

## Build all Docker images from source
build:
	@echo "==> Building all EventHub Docker images..."
	$(COMPOSE) --env-file $(ENV_FILE) build --no-cache
	@echo "==> Build complete."

## Start all services in detached mode
start:
	@echo "==> Starting EventHub services..."
	$(COMPOSE) --env-file $(ENV_FILE) up -d
	@echo "==> Services started. Run 'make status' to check health."

## Stop all services (containers remain, volumes preserved)
stop:
	@echo "==> Stopping EventHub services..."
	$(COMPOSE) --env-file $(ENV_FILE) down
	@echo "==> Services stopped."

## Restart all services
restart:
	@echo "==> Restarting EventHub services..."
	$(COMPOSE) --env-file $(ENV_FILE) restart
	@echo "==> Restart complete."

## Show the health status of all containers
status:
	@echo "==> EventHub Container Status:"
	$(COMPOSE) --env-file $(ENV_FILE) ps

## Tail logs from ALL services (Ctrl+C to exit)
logs:
	$(COMPOSE) --env-file $(ENV_FILE) logs -f --tail=100

## Pull latest Git changes, rebuild, and redeploy (zero-downtime approach)
update:
	@echo "==> Pulling latest code..."
	git pull
	@echo "==> Rebuilding changed images..."
	$(COMPOSE) --env-file $(ENV_FILE) build
	@echo "==> Redeploying services (rolling restart)..."
	$(COMPOSE) --env-file $(ENV_FILE) up -d --remove-orphans
	@echo "==> Update complete. Run 'make status' to verify."

# ─── Per-Service Logs ─────────────────────────────────────────

logs-gateway:
	$(COMPOSE) logs -f --tail=100 gateway-service

logs-auth:
	$(COMPOSE) logs -f --tail=100 auth-service

logs-event:
	$(COMPOSE) logs -f --tail=100 event-service

logs-booking:
	$(COMPOSE) logs -f --tail=100 booking-service

logs-nginx:
	$(COMPOSE) logs -f --tail=100 nginx

logs-mysql:
	$(COMPOSE) logs -f --tail=100 mysql

# ─── Database Operations ──────────────────────────────────────

## Run a manual database backup
backup:
	@echo "==> Running database backup..."
	@chmod +x scripts/backup.sh
	@./scripts/backup.sh

## Restore database from a backup file
## Usage: make restore FILE=./backups/eventhub_backup_20260101_120000.sql
restore:
	@if [ -z "$(FILE)" ]; then \
	  echo "ERROR: Specify backup file: make restore FILE=./backups/<filename>.sql"; \
	  exit 1; \
	fi
	@chmod +x scripts/restore.sh
	@./scripts/restore.sh $(FILE)

## Setup nightly auto-backup cron job (run once on EC2)
setup-backup-cron:
	@echo "==> Setting up nightly backup cron job (runs at 2 AM)..."
	@chmod +x scripts/auto-backup.sh
	@(crontab -l 2>/dev/null; echo "0 2 * * * cd $$(pwd) && ./scripts/auto-backup.sh >> /var/log/eventhub-backup.log 2>&1") | sort -u | crontab -
	@echo "==> Cron job installed. Verify with: crontab -l"

# ─── Maintenance ──────────────────────────────────────────────

## Remove stopped containers and dangling images (free disk space)
clean:
	@echo "==> Cleaning up stopped containers and dangling images..."
	docker compose down --remove-orphans
	docker image prune -f
	docker volume prune -f --filter label!=keep
	@echo "==> Cleanup complete."

## Open a MySQL shell inside the container
mysql-shell:
	docker exec -it eventhub-mysql mysql -u root --password="$${MYSQL_ROOT_PASSWORD}" ticketbooking

## Open a Redis CLI shell inside the container
redis-shell:
	docker exec -it eventhub-redis redis-cli

## Access Grafana via SSH tunnel (run this on your LOCAL machine)
## ssh -L 3000:localhost:3000 ubuntu@<ec2-ip>
grafana-tunnel:
	@echo "Run this on your LOCAL machine:"
	@echo "  ssh -L 3000:grafana:3000 -L 9090:prometheus:9090 ubuntu@<YOUR-EC2-IP>"
	@echo "Then open: http://localhost:3000 (Grafana)"
	@echo "       and: http://localhost:9090 (Prometheus)"
