#!/bin/bash

# ABOUTME: Setup script for HTTPS development environment
# Generates SSL certificates using mkcert for local HTTPS development
# Enables camera access on iOS Safari through Tailscale networking

set -e

echo "🔧 Setting up HTTPS development environment..."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if mkcert binary exists
if [ ! -f "./mkcert-v1.4.4-linux-amd64" ]; then
    echo -e "${YELLOW}📥 Downloading mkcert...${NC}"
    curl -JLO "https://dl.filippo.io/mkcert/latest?for=linux/amd64"
    chmod +x mkcert-v*-linux-amd64
    echo -e "${GREEN}✅ mkcert downloaded successfully${NC}"
else
    echo -e "${GREEN}✅ mkcert binary already exists${NC}"
fi

# Create certs directory
echo -e "${BLUE}📁 Creating certificates directory...${NC}"
mkdir -p certs

# Get current Tailscale IP (if available)
TAILSCALE_IP="100.126.153.59"
if command -v tailscale &> /dev/null; then
    CURRENT_IP=$(tailscale ip -4 2>/dev/null || echo "")
    if [ ! -z "$CURRENT_IP" ]; then
        TAILSCALE_IP="$CURRENT_IP"
        echo -e "${BLUE}🔍 Detected Tailscale IP: $TAILSCALE_IP${NC}"
    fi
fi

# Generate certificates
echo -e "${YELLOW}🔐 Generating SSL certificates...${NC}"
./mkcert-v*-linux-amd64 -key-file certs/localhost-key.pem -cert-file certs/localhost-cert.pem localhost 127.0.0.1 $TAILSCALE_IP ::1

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ SSL certificates generated successfully!${NC}"
else
    echo -e "${RED}❌ Failed to generate SSL certificates${NC}"
    exit 1
fi

# Check if certificates were created
if [ -f "certs/localhost-cert.pem" ] && [ -f "certs/localhost-key.pem" ]; then
    echo -e "${GREEN}✅ Certificate files created:${NC}"
    echo "   • certs/localhost-cert.pem"
    echo "   • certs/localhost-key.pem"
else
    echo -e "${RED}❌ Certificate files not found after generation${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}🎉 HTTPS development environment setup complete!${NC}"
echo ""
echo -e "${BLUE}📱 Usage Instructions:${NC}"
echo ""
echo -e "${YELLOW}1. Start HTTPS development server:${NC}"
echo "   npm run dev:https"
echo ""
echo -e "${YELLOW}2. Access the application:${NC}"
echo "   • Local: https://localhost:3001"
echo "   • Tailscale: https://$TAILSCALE_IP:3001"
echo ""
echo -e "${YELLOW}3. For iOS Safari (QR scanner):${NC}"
echo "   a. Ensure your iPhone is connected to Tailscale"
echo "   b. Visit https://$TAILSCALE_IP:3001 in Safari"
echo "   c. Accept certificate warning (tap 'Advanced' → 'Proceed')"
echo "   d. Camera access should now work for QR scanning"
echo ""
echo -e "${RED}⚠️  Certificate Warnings:${NC}"
echo "   You may see 'Not Secure' warnings since the local CA is not"
echo "   installed in the system trust store. This is normal for development."
echo "   The connection is still encrypted and safe for development use."
echo ""
echo -e "${BLUE}🔧 Optional: Install mkcert system-wide for trusted certificates:${NC}"
echo "   sudo ./mkcert-v*-linux-amd64 -install"
echo "   (This requires sudo and will eliminate browser warnings)"
echo ""