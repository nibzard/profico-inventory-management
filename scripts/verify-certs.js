#!/usr/bin/env node

/**
 * ABOUTME: Certificate verification utility for HTTPS development
 * 
 * This script verifies that SSL certificates are properly generated
 * and displays certificate information for debugging.
 */

const { readFileSync, existsSync } = require('fs');
const { createHash } = require('crypto');
const path = require('path');

const certPath = path.join(__dirname, '../certs/localhost-cert.pem');
const keyPath = path.join(__dirname, '../certs/localhost-key.pem');

function formatBytes(bytes) {
  return `${bytes} bytes (${(bytes / 1024).toFixed(1)} KB)`;
}

function getCertificateInfo(certContent) {
  try {
    // Basic certificate parsing (simplified)
    const lines = certContent.split('\n');
    const certStart = lines.findIndex(line => line.includes('-----BEGIN CERTIFICATE-----'));
    const certEnd = lines.findIndex(line => line.includes('-----END CERTIFICATE-----'));
    
    if (certStart === -1 || certEnd === -1) {
      return 'Invalid certificate format';
    }
    
    const hash = createHash('sha256').update(certContent).digest('hex').substring(0, 16);
    return `Certificate hash: ${hash}...`;
  } catch (error) {
    return `Error parsing certificate: ${error.message}`;
  }
}

console.log('🔐 SSL Certificate Verification\n');

// Check certificate file
if (existsSync(certPath)) {
  try {
    const certContent = readFileSync(certPath, 'utf8');
    const certSize = Buffer.byteLength(certContent, 'utf8');
    
    console.log('✅ Certificate file found:');
    console.log(`   Path: ${certPath}`);
    console.log(`   Size: ${formatBytes(certSize)}`);
    console.log(`   Info: ${getCertificateInfo(certContent)}`);
  } catch (error) {
    console.log('❌ Error reading certificate file:', error.message);
  }
} else {
  console.log('❌ Certificate file not found:', certPath);
}

console.log('');

// Check key file
if (existsSync(keyPath)) {
  try {
    const keyContent = readFileSync(keyPath, 'utf8');
    const keySize = Buffer.byteLength(keyContent, 'utf8');
    
    console.log('✅ Private key file found:');
    console.log(`   Path: ${keyPath}`);
    console.log(`   Size: ${formatBytes(keySize)}`);
    
    // Verify key format
    if (keyContent.includes('-----BEGIN PRIVATE KEY-----') || 
        keyContent.includes('-----BEGIN RSA PRIVATE KEY-----')) {
      console.log('   Format: Valid private key format detected');
    } else {
      console.log('   Format: ⚠️  Unexpected key format');
    }
  } catch (error) {
    console.log('❌ Error reading private key file:', error.message);
  }
} else {
  console.log('❌ Private key file not found:', keyPath);
}

console.log('');

// Overall status
const bothExist = existsSync(certPath) && existsSync(keyPath);
if (bothExist) {
  console.log('🎉 SSL certificates are ready for HTTPS development!');
  console.log('');
  console.log('Next steps:');
  console.log('1. Run: npm run dev:https');
  console.log('2. Visit: https://localhost:3001');
  console.log('3. For iOS: https://100.126.153.59:3001');
} else {
  console.log('❌ SSL certificates are not ready.');
  console.log('');
  console.log('To generate certificates, run:');
  console.log('  ./scripts/setup-https.sh');
  console.log('');
  console.log('Or manually:');
  console.log('  mkdir -p certs');
  console.log('  ./mkcert-v1.4.4-linux-amd64 -key-file certs/localhost-key.pem -cert-file certs/localhost-cert.pem localhost 127.0.0.1 100.126.153.59 ::1');
}

console.log('');