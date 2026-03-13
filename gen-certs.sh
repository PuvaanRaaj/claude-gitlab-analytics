#!/bin/sh
# Generate a self-signed TLS cert for local/internal use
# Usage: ./gen-certs.sh [CN]  (default CN: localhost)

CN=${1:-localhost}
CERTS_DIR="$(dirname "$0")/certs"

mkdir -p "$CERTS_DIR"

openssl req -x509 -nodes -newkey rsa:2048 -days 365 \
  -keyout "$CERTS_DIR/key.pem" \
  -out    "$CERTS_DIR/cert.pem" \
  -subj   "/CN=$CN"

echo "Certs written to $CERTS_DIR/"
