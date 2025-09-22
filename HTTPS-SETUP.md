# HTTPS Development Setup for ProfiCo Inventory Management

This guide explains how to set up HTTPS for local development to enable camera access on iOS Safari through Tailscale networking.

## Overview

The QR scanner feature requires HTTPS to access the device camera on iOS Safari. This setup creates a local HTTPS development server with trusted SSL certificates that work through Tailscale networking.

## Quick Setup

### 1. Generate SSL Certificates

Run the automated setup script:

```bash
npm run setup:https
```

This will:
- Download mkcert (if not already present)
- Generate SSL certificates for localhost and your Tailscale IP
- Create the necessary certificate files in the `certs/` directory

### 2. Start HTTPS Development Server

```bash
npm run dev:https
```

This starts:
- HTTPS server on port 3001
- HTTP redirect server on port 3000 (redirects to HTTPS)

### 3. Access the Application

**Local access:**
- https://localhost:3001
- https://127.0.0.1:3001

**Tailscale access (for iOS testing):**
- https://100.126.153.59:3001

## iOS Safari Setup

1. **Connect iPhone to Tailscale**
   - Install Tailscale app on iPhone
   - Connect to the same Tailscale network

2. **Access the Application**
   - Open Safari on iPhone
   - Navigate to `https://100.126.153.59:3001`

3. **Accept Certificate Warning**
   - You'll see "This Connection Is Not Private"
   - Tap "Advanced"
   - Tap "Proceed to 100.126.153.59 (Unsafe)"
   - This is safe for development - the connection is encrypted

4. **Test Camera Access**
   - Navigate to any QR scanner feature
   - Safari should now request camera permission
   - Camera access should work for QR code scanning

## Available Commands

| Command | Description |
|---------|-------------|
| `npm run setup:https` | Generate SSL certificates and setup HTTPS environment |
| `npm run dev:https` | Start HTTPS development server |
| `npm run verify:certs` | Verify SSL certificates are properly generated |
| `npm run dev` | Start regular HTTP development server |

## Certificate Details

**Generated certificates include:**
- `localhost` - For local development
- `127.0.0.1` - For local IP access
- `100.126.153.59` - For Tailscale access (your current Tailscale IP)
- `::1` - For IPv6 localhost

**Certificate files:**
- `certs/localhost-cert.pem` - SSL certificate
- `certs/localhost-key.pem` - Private key

## Troubleshooting

### Certificate Warnings

**Problem:** Browser shows "Not Secure" or certificate warnings

**Solution:** This is expected behavior since the local CA is not installed in the system trust store. The connection is still encrypted and safe for development.

**Optional:** Install mkcert system-wide to eliminate warnings:
```bash
sudo ./mkcert-v1.4.4-linux-amd64 -install
```

### Camera Not Working on iOS

**Problem:** Camera access still denied on iOS Safari

**Checklist:**
1. Ensure you're using HTTPS (not HTTP)
2. Accept certificate warnings in Safari
3. Check Safari's camera permissions in iOS Settings
4. Try reloading the page after accepting certificates
5. Verify Tailscale connection on iPhone

### Port Conflicts

**Problem:** Port 3001 already in use

**Solution:** Modify the HTTPS port in `scripts/dev-https.js`:
```javascript
const HTTPS_PORT = process.env.HTTPS_PORT || 3002; // Change to available port
```

### Certificate Errors

**Problem:** SSL certificate errors

**Diagnosis:**
```bash
npm run verify:certs
```

**Solution:** Regenerate certificates:
```bash
rm -rf certs/
npm run setup:https
```

## Architecture

### Development Server Flow

```
Request → HTTP Server (3000) → Redirect to HTTPS
       ↓
Request → HTTPS Server (3001) → Next.js App
```

### Certificate Generation

```
mkcert → Local CA → SSL Certificate → HTTPS Server
```

### Tailscale Network Access

```
iPhone (Safari) → Tailscale Network → HTTPS Server → Camera API
```

## Security Notes

- Certificates are valid for 3 months and auto-renewable
- Private keys are stored locally and excluded from version control
- HTTPS connection is encrypted even without system CA trust
- Development certificates should never be used in production

## Files Created

```
├── certs/
│   ├── localhost-cert.pem    # SSL certificate
│   └── localhost-key.pem     # Private key
├── scripts/
│   ├── dev-https.js          # HTTPS development server
│   ├── setup-https.sh        # Certificate generation script
│   └── verify-certs.js       # Certificate verification utility
└── mkcert-v1.4.4-linux-amd64 # mkcert binary
```

## Production Deployment

For production deployment:
- Use proper SSL certificates from a trusted CA
- Configure your production server with HTTPS
- Update Tailscale configuration for production access
- Remove development certificates from production builds

## Additional Resources

- [mkcert Documentation](https://github.com/FiloSottile/mkcert)
- [Tailscale Networking Guide](https://tailscale.com/kb/)
- [iOS Safari Camera API Requirements](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia#security)