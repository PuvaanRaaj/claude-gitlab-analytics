#!/bin/sh
# Auto-generate self-signed cert if not mounted
if [ ! -f /etc/nginx/certs/cert.pem ] || [ ! -f /etc/nginx/certs/key.pem ]; then
  echo "No certs found — generating self-signed cert..."
  mkdir -p /etc/nginx/certs
  openssl req -x509 -nodes -newkey rsa:2048 -days 365 \
    -keyout /etc/nginx/certs/key.pem \
    -out    /etc/nginx/certs/cert.pem \
    -subj   "/CN=localhost" 2>&1
  echo "Self-signed cert generated."
fi

exec nginx -g "daemon off;"
