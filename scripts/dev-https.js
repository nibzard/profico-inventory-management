#!/usr/bin/env node

/**
 * ABOUTME: Custom HTTPS development server for ProfiCo Inventory Management
 * 
 * This script creates an HTTPS development server to enable camera access
 * on iOS Safari through Tailscale networking. Uses locally generated
 * mkcert certificates for trusted SSL connections.
 */

const { createServer } = require('https');
const { createServer: createHttpServer } = require('http');
const { readFileSync, existsSync } = require('fs');
const { parse } = require('url');
const next = require('next');
const path = require('path');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

const HTTPS_PORT = process.env.HTTPS_PORT || 3001;
const HTTP_PORT = process.env.PORT || 3000;

// Paths to SSL certificates
const certPath = path.join(__dirname, '../certs/localhost-cert.pem');
const keyPath = path.join(__dirname, '../certs/localhost-key.pem');

async function startServer() {
  try {
    await app.prepare();

    // Check if SSL certificates exist
    if (!existsSync(certPath) || !existsSync(keyPath)) {
      console.error('❌ SSL certificates not found!');
      console.error('Please run the following commands to generate certificates:');
      console.error('  mkdir -p certs');
      console.error('  ./mkcert-v1.4.4-linux-amd64 -key-file certs/localhost-key.pem -cert-file certs/localhost-cert.pem localhost 127.0.0.1 100.126.153.59 ::1');
      process.exit(1);
    }

    // Read SSL certificates
    const httpsOptions = {
      key: readFileSync(keyPath),
      cert: readFileSync(certPath),
    };

    // Create HTTPS server
    const httpsServer = createServer(httpsOptions, (req, res) => {
      const parsedUrl = parse(req.url, true);
      handle(req, res, parsedUrl);
    });

    // Create HTTP server that redirects to HTTPS
    const httpServer = createHttpServer((req, res) => {
      const host = req.headers.host?.split(':')[0] || 'localhost';
      const httpsUrl = `https://${host}:${HTTPS_PORT}${req.url}`;
      
      res.writeHead(301, { Location: httpsUrl });
      res.end();
    });

    // Start servers
    httpsServer.listen(HTTPS_PORT, '0.0.0.0', (err) => {
      if (err) throw err;
      console.log('🚀 HTTPS Development Server started successfully!');
      console.log('');
      console.log('📱 Local access:');
      console.log(`   • https://localhost:${HTTPS_PORT}`);
      console.log(`   • https://127.0.0.1:${HTTPS_PORT}`);
      console.log('');
      console.log('🌐 Tailscale access (for iOS testing):');
      console.log(`   • https://100.126.153.59:${HTTPS_PORT}`);
      console.log('');
      console.log('🔐 SSL Certificate includes:');
      console.log('   • localhost');
      console.log('   • 127.0.0.1');
      console.log('   • 100.126.153.59 (Tailscale IP)');
      console.log('   • ::1');
      console.log('');
      console.log('📱 For iOS Safari camera access:');
      console.log('   1. Connect your iPhone to Tailscale');
      console.log(`   2. Visit https://100.126.153.59:${HTTPS_PORT}`);
      console.log('   3. Accept the certificate warning (one-time)');
      console.log('   4. Camera access should now work for QR scanning');
      console.log('');
      console.log('⚠️  Note: You may see certificate warnings since the local CA');
      console.log('    is not installed in the system trust store. This is normal');
      console.log('    for development. Accept the warning to proceed.');
    });

    httpServer.listen(HTTP_PORT, '0.0.0.0', (err) => {
      if (err) throw err;
      console.log(`🔄 HTTP redirect server running on port ${HTTP_PORT} (redirects to HTTPS)`);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('🛑 Shutting down servers...');
      httpsServer.close();
      httpServer.close();
      process.exit(0);
    });

    process.on('SIGINT', () => {
      console.log('🛑 Shutting down servers...');
      httpsServer.close();
      httpServer.close();
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Failed to start HTTPS development server:', error);
    process.exit(1);
  }
}

startServer();