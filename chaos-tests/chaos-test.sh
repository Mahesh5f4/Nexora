#!/bin/bash

# Chaos Testing Script for EventHub Microservices
# This script forcefully stops critical backing services (Redis, RabbitMQ, MySQL) 
# to test application resilience, circuit breakers, and automatic recovery.

set -e

echo "=========================================="
echo "    Starting Chaos Testing for EventHub   "
echo "=========================================="

echo "[1/4] Starting all services normally..."
docker-compose up -d
sleep 15 # wait for services to boot

echo "[2/4] Injecting Chaos: Stopping Redis..."
docker stop eventhub-redis
echo "Redis stopped. Applications should fallback gracefully or reject fast (Circuit Breaker)."
# Here you would typically run a mini load-test to verify behavior
sleep 10
echo "Restoring Redis..."
docker start eventhub-redis
sleep 5

echo "[3/4] Injecting Chaos: Stopping RabbitMQ..."
docker stop eventhub-rabbitmq
echo "RabbitMQ stopped. Async tasks should fail or queue in memory depending on resilience."
sleep 10
echo "Restoring RabbitMQ..."
docker start eventhub-rabbitmq
sleep 5

echo "[4/4] Injecting Chaos: Restarting Event Service..."
docker restart eventhub-event-service
echo "Event Service restarted. Gateway should temporarily return 503 Service Unavailable, then recover."
sleep 15

echo "=========================================="
echo "    Chaos Testing Completed Successfully  "
echo "=========================================="
echo "Check Grafana/Prometheus metrics to verify that error rates spiked and recovered!"
