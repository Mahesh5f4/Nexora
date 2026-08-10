#!/bin/bash
# =============================================================
# init-letsencrypt.sh — Let's Encrypt Certificate Initializer
# =============================================================
# Run this ONCE on your EC2 server after DNS is pointed to your IP.
#
# Usage:
#   chmod +x init-letsencrypt.sh
#   ./init-letsencrypt.sh yourdomain.com your@email.com
#
# What it does:
#   1. Creates Certbot directories
#   2. Starts Nginx in HTTP-only mode (needed for ACME challenge)
#   3. Obtains Let's Encrypt staging cert (to test flow without rate limits)
#   4. Obtains Let's Encrypt PRODUCTION cert
#   5. Sets up auto-renewal (Certbot renews certs every 60 days)
# =============================================================

set -e

DOMAIN=${1:?Usage: ./init-letsencrypt.sh <domain> <email>}
EMAIL=${2:?Usage: ./init-letsencrypt.sh <domain> <email>}

CERTBOT_CONF="./certbot/conf"
CERTBOT_WWW="./certbot/www"

echo "==> Creating Certbot directories..."
mkdir -p "$CERTBOT_CONF" "$CERTBOT_WWW"

echo "==> Ensuring Nginx is running in HTTP mode (for ACME challenge)..."
docker compose up -d nginx

echo "==> Waiting for Nginx to start..."
sleep 5

echo "==> Requesting Let's Encrypt STAGING certificate (dry run, no rate limits)..."
docker run --rm \
  -v "$(pwd)/certbot/conf:/etc/letsencrypt" \
  -v "$(pwd)/certbot/www:/var/www/certbot" \
  certbot/certbot:latest certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  --email "$EMAIL" \
  --agree-tos \
  --no-eff-email \
  --staging \
  -d "$DOMAIN"

echo "==> Staging cert obtained successfully. Requesting PRODUCTION certificate..."
docker run --rm \
  -v "$(pwd)/certbot/conf:/etc/letsencrypt" \
  -v "$(pwd)/certbot/www:/var/www/certbot" \
  certbot/certbot:latest certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  --email "$EMAIL" \
  --agree-tos \
  --no-eff-email \
  --force-renewal \
  -d "$DOMAIN"

echo "==> Certificate obtained! Activating HTTPS Nginx config..."
cp nginx/conf.d/default-https.conf /tmp/default-https-temp.conf
sed -i "s/YOUR_DOMAIN/$DOMAIN/g" /tmp/default-https-temp.conf
cp /tmp/default-https-temp.conf nginx/conf.d/default.conf
echo "  -> Replaced YOUR_DOMAIN with $DOMAIN in nginx config"

echo "==> Reloading Nginx with HTTPS config..."
docker compose restart nginx

echo ""
echo "===========================================================" 
echo "  HTTPS setup complete!"
echo "  Your API is now available at: https://$DOMAIN"
echo ""
echo "  Certificate auto-renewal:"
echo "  Add this to crontab (crontab -e):"
echo "  0 0 * * * cd $(pwd) && docker run --rm \\"
echo "    -v $(pwd)/certbot/conf:/etc/letsencrypt \\"
echo "    -v $(pwd)/certbot/www:/var/www/certbot \\"
echo "    certbot/certbot:latest renew --quiet && docker compose restart nginx"
echo "==========================================================="
