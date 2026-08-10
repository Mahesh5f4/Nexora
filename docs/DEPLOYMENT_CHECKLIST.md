# EventHub — Production Deployment Checklist

Run this checklist after deploying on EC2. Each item includes the exact command to verify it.

---

## Phase 1: Infrastructure Health

### □ MySQL is running and healthy
```bash
docker compose ps mysql
# Expected: STATUS = healthy

docker exec eventhub-mysql mysqladmin ping -u root --password="$MYSQL_ROOT_PASSWORD" -h localhost
# Expected: mysqld is alive
```

### □ Redis is running and healthy
```bash
docker compose ps redis
# Expected: STATUS = healthy

docker exec eventhub-redis redis-cli ping
# Expected: PONG
```

### □ RabbitMQ is running and healthy
```bash
docker compose ps rabbitmq
# Expected: STATUS = healthy

docker exec eventhub-rabbitmq rabbitmq-diagnostics check_port_connectivity
# Expected: Connectivity diagnostics... OK
```

---

## Phase 2: Application Services Health

### □ Auth Service is running and healthy
```bash
docker compose ps auth-service
# Expected: STATUS = healthy

curl -s http://localhost/api/auth/actuator/health | python3 -m json.tool
# Via Nginx proxy — Expected: {"status":"UP",...}

# Or directly (internal check):
docker exec eventhub-auth-service wget -q -O - http://localhost:8081/api/actuator/health
```

### □ Event Service is running and healthy
```bash
docker compose ps event-service

docker exec eventhub-event-service wget -q -O - http://localhost:8082/api/actuator/health
# Expected: {"status":"UP",...}
```

### □ Booking Service is running and healthy
```bash
docker compose ps booking-service

docker exec eventhub-booking-service wget -q -O - http://localhost:8083/api/actuator/health
# Expected: {"status":"UP",...}
```

### □ Gateway Service is running and healthy
```bash
docker compose ps gateway-service

docker exec eventhub-gateway-service wget -q -O - http://localhost:8080/actuator/health
# Expected: {"status":"UP",...}
```

### □ ML Service is running and healthy
```bash
docker compose ps ml-service

docker exec eventhub-ml-service python -c \
  "import urllib.request; print(urllib.request.urlopen('http://localhost:8001/health').read())"
# Expected: b'{"status":"healthy"}'
```

---

## Phase 3: Nginx & External Access

### □ Nginx is running
```bash
docker compose ps nginx
# Expected: STATUS = healthy

# Test config is valid
docker exec eventhub-nginx nginx -t
# Expected: nginx: configuration file /etc/nginx/nginx.conf test is successful
```

### □ Public HTTP access works
```bash
# Replace with your EC2 IP or domain
curl -v http://<YOUR-EC2-IP>/health
# Expected: HTTP 200, body: "healthy"
```

### □ API Gateway routes correctly
```bash
# Test auth endpoint through the full stack: Nginx → Gateway → Auth Service
curl -v http://<YOUR-EC2-IP>/api/auth/actuator/health
# Expected: HTTP 200, {"status":"UP"}

# Test events endpoint through the full stack: Nginx → Gateway → Event Service
curl -v http://<YOUR-EC2-IP>/api/events/actuator/health
# Expected: HTTP 200, {"status":"UP"}
```

---

## Phase 4: Database Connectivity

### □ MySQL connected (auth-service connects successfully)
```bash
# Look for "HikariPool ... Start completed" in auth service logs
docker compose logs auth-service | grep -i "hikari\|database\|mysql" | tail -20
# Expected: HikariPool-1 - Start completed.
```

### □ Redis connected (auth-service cache works)
```bash
docker compose logs auth-service | grep -i "redis\|cache" | tail -10
# Expected: No connection refused errors
```

### □ RabbitMQ connected (booking-service connects)
```bash
docker compose logs booking-service | grep -i "rabbitmq\|amqp\|rabbit" | tail -10
# Expected: Successfully connected to rabbitmq
```

---

## Phase 5: Authentication

### □ User Registration works
```bash
curl -X POST http://<YOUR-EC2-IP>/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"TestPass123!"}'
# Expected: HTTP 200 or 201 with user data
```

### □ User Login returns JWT token
```bash
curl -X POST http://<YOUR-EC2-IP>/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPass123!"}'
# Expected: HTTP 200 with {"token":"eyJ..."}
```

### □ JWT authentication protects endpoints
```bash
# Without token — should be rejected
curl -v http://<YOUR-EC2-IP>/api/events
# Expected: HTTP 401 Unauthorized

# With token — should succeed
TOKEN="eyJ..."  # From login response above
curl -v http://<YOUR-EC2-IP>/api/events \
  -H "Authorization: Bearer $TOKEN"
# Expected: HTTP 200 with events list
```

---

## Phase 6: ML Service

### □ ML Service reachable from event-service
```bash
# Check event-service can reach ml-service
docker exec eventhub-event-service wget -q -O - http://ml-service:8001/health
# Expected: {"status":"healthy"}

# Check ML recommendations endpoint works
docker logs eventhub-ml-service | tail -20
# Expected: No errors
```

---

## Phase 7: Swagger UI

### □ Swagger UI accessible
```bash
# Open in browser: http://<YOUR-EC2-IP>/swagger-ui.html
# Or test with curl:
curl -v http://<YOUR-EC2-IP>/swagger-ui.html
# Expected: HTTP 200 with HTML

# Individual service API docs:
curl -v http://<YOUR-EC2-IP>/api/auth/v3/api-docs
curl -v http://<YOUR-EC2-IP>/api/events/v3/api-docs
curl -v http://<YOUR-EC2-IP>/api/bookings/v3/api-docs
```

---

## Phase 8: Monitoring

### □ Prometheus scraping all services
```bash
# Access Prometheus via SSH tunnel (from your local machine):
# ssh -L 9090:prometheus:9090 ubuntu@<EC2-IP>
# Then open: http://localhost:9090/targets
# Expected: All 4 service targets are "UP"
```

### □ Grafana accessible
```bash
# Access Grafana via SSH tunnel (from your local machine):
# ssh -L 3000:grafana:3000 ubuntu@<EC2-IP>
# Then open: http://localhost:3000
# Login with admin / your GF_ADMIN_PASSWORD
```

---

## Phase 9: Persistence

### □ Data persists after restart
```bash
# Stop all services
docker compose stop

# Start again
docker compose start

# Wait for health checks to pass (~2 minutes)
docker compose ps

# Verify database data is still there
docker exec eventhub-mysql mysql -u root --password="$MYSQL_ROOT_PASSWORD" \
  -e "SELECT COUNT(*) FROM ticketbooking.users;" 2>/dev/null
# Expected: Returns count > 0 (if you registered a user before restart)
```

---

## Phase 10: HTTPS (After Domain Setup)

### □ HTTP redirects to HTTPS
```bash
curl -v http://yourdomain.com/health
# Expected: HTTP 301 redirect to https://yourdomain.com/health
```

### □ HTTPS certificate is valid
```bash
curl -v https://yourdomain.com/health
# Expected: HTTP 200, valid SSL certificate

# Check certificate details
openssl s_client -connect yourdomain.com:443 -servername yourdomain.com < /dev/null 2>/dev/null \
  | openssl x509 -noout -dates
# Expected: notAfter= is ~90 days in the future (Let's Encrypt)
```

### □ HSTS header is present
```bash
curl -I https://yourdomain.com/health | grep -i strict
# Expected: Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

---

## Summary Checklist

```
Infrastructure:
  □ MySQL healthy
  □ Redis healthy
  □ RabbitMQ healthy

Services:
  □ Auth Service healthy
  □ Event Service healthy
  □ Booking Service healthy
  □ Gateway Service healthy
  □ ML Service healthy

Routing:
  □ Nginx running
  □ Public HTTP access works
  □ Gateway routes correctly

Connectivity:
  □ MySQL connected
  □ Redis connected
  □ RabbitMQ connected

Auth:
  □ Registration works
  □ Login returns JWT
  □ JWT protects endpoints

Features:
  □ ML service reachable
  □ Swagger UI accessible

Monitoring:
  □ Prometheus scraping all targets
  □ Grafana accessible (via tunnel)

Persistence:
  □ Data survives container restart

HTTPS (optional):
  □ HTTP → HTTPS redirect works
  □ SSL certificate valid
  □ HSTS header present

Backups:
  □ Manual backup works: make backup
  □ Nightly cron installed: make setup-backup-cron
```

---

## All Checks Pass? 🎉

Your EventHub backend is production-ready on AWS EC2.

**API Base URL:** `http://<YOUR-EC2-IP>` (or `https://yourdomain.com` with HTTPS)

**Swagger UI:** `http://<YOUR-EC2-IP>/swagger-ui.html`
