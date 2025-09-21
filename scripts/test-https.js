#!/usr/bin/env node

/**
 * ABOUTME: HTTPS setup verification script
 * 
 * This script tests the complete HTTPS development setup including
 * certificate validation, server connectivity, and Tailscale access.
 */

const https = require('https');
const { existsSync } = require('fs');
const path = require('path');

const HTTPS_PORT = 3001;
const TAILSCALE_IP = '100.126.153.59';

function testConnection(hostname, port, timeout = 5000) {
  return new Promise((resolve) => {
    const options = {
      hostname,
      port,
      path: '/',
      method: 'HEAD',
      rejectUnauthorized: false, // Accept self-signed certificates for testing
      timeout
    };

    const req = https.request(options, (res) => {
      resolve({
        success: true,
        statusCode: res.statusCode,
        headers: res.headers
      });
    });

    req.on('error', (error) => {
      resolve({
        success: false,
        error: error.message
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        success: false,
        error: 'Connection timeout'
      });
    });

    req.end();
  });
}

async function runTests() {
  console.log('🧪 HTTPS Development Server Test Suite\n');

  // Test 1: Check certificate files
  console.log('1. Checking SSL certificates...');
  const certPath = path.join(__dirname, '../certs/localhost-cert.pem');
  const keyPath = path.join(__dirname, '../certs/localhost-key.pem');

  if (existsSync(certPath) && existsSync(keyPath)) {
    console.log('   ✅ SSL certificate files found');
  } else {
    console.log('   ❌ SSL certificate files missing');
    console.log('   Run: npm run setup:https');
    return;
  }

  // Test 2: Test localhost connection
  console.log('\n2. Testing localhost HTTPS connection...');
  const localhostResult = await testConnection('localhost', HTTPS_PORT);
  if (localhostResult.success) {
    console.log(`   ✅ localhost:${HTTPS_PORT} - Status: ${localhostResult.statusCode}`);
  } else {
    console.log(`   ❌ localhost:${HTTPS_PORT} - Error: ${localhostResult.error}`);
  }

  // Test 3: Test 127.0.0.1 connection
  console.log('\n3. Testing 127.0.0.1 HTTPS connection...');
  const ipResult = await testConnection('127.0.0.1', HTTPS_PORT);
  if (ipResult.success) {
    console.log(`   ✅ 127.0.0.1:${HTTPS_PORT} - Status: ${ipResult.statusCode}`);
  } else {
    console.log(`   ❌ 127.0.0.1:${HTTPS_PORT} - Error: ${ipResult.error}`);
  }

  // Test 4: Test Tailscale IP connection
  console.log('\n4. Testing Tailscale IP HTTPS connection...');
  const tailscaleResult = await testConnection(TAILSCALE_IP, HTTPS_PORT);
  if (tailscaleResult.success) {
    console.log(`   ✅ ${TAILSCALE_IP}:${HTTPS_PORT} - Status: ${tailscaleResult.statusCode}`);
  } else {
    console.log(`   ❌ ${TAILSCALE_IP}:${HTTPS_PORT} - Error: ${tailscaleResult.error}`);
  }

  console.log('\n📱 iOS Safari Testing Instructions:\n');
  
  if (tailscaleResult.success) {
    console.log('✅ Tailscale connection successful! Follow these steps:');
    console.log('   1. Connect your iPhone to the same Tailscale network');
    console.log('   2. Open Safari and navigate to:');
    console.log(`      https://${TAILSCALE_IP}:${HTTPS_PORT}`);
    console.log('   3. Accept the certificate warning (tap Advanced → Proceed)');
    console.log('   4. Test QR scanner functionality');
    console.log('   5. Safari should request camera permission');
  } else {
    console.log('❌ Tailscale connection failed. Check:');
    console.log('   • HTTPS development server is running (npm run dev:https)');
    console.log('   • Tailscale is connected on this device');
    console.log('   • Firewall settings allow port 3001');
  }

  console.log('\n🔧 Troubleshooting:');
  console.log('   • Regenerate certificates: npm run setup:https');
  console.log('   • Verify certificates: npm run verify:certs');
  console.log('   • Check server logs for errors');
  console.log('   • Ensure no other service is using port 3001');

  // Summary
  const allSuccess = localhostResult.success && ipResult.success && tailscaleResult.success;
  console.log(`\n${allSuccess ? '🎉' : '⚠️'} Test Summary:`);
  console.log(`   Localhost: ${localhostResult.success ? '✅' : '❌'}`);
  console.log(`   IP Access: ${ipResult.success ? '✅' : '❌'}`);
  console.log(`   Tailscale: ${tailscaleResult.success ? '✅' : '❌'}`);

  if (allSuccess) {
    console.log('\n🚀 HTTPS development environment is ready for iOS testing!');
  } else {
    console.log('\n🔧 Some tests failed. Please check the troubleshooting steps above.');
  }
}

runTests().catch(console.error);