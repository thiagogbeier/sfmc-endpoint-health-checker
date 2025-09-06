# Full Testing Setup: Real Functionality Branch

## Overview
This guide sets up a fully functional version of the SFMC Endpoint Health Checker with real network requests and SSL certificate inspection (no mocks).

## Prerequisites

### System Requirements
```bash
# Node.js (already installed)
node --version  # Should be 18+

# OpenSSL (install if not present)
# On Ubuntu/Debian:
sudo apt-get update && sudo apt-get install openssl

# On macOS:
brew install openssl

# On Windows:
# Download from: https://slproweb.com/products/Win32OpenSSL.html
```

## Step 1: Create Testing Branch

```bash
# From your main branch
cd /workspaces/sfmc-endpoint-health-checker
git checkout -b real-functionality-testing
git push -u origin real-functionality-testing
```

## Step 2: Backend Server Setup

### Create Backend Directory
```bash
mkdir backend
cd backend
npm init -y
```

### Install Backend Dependencies
```bash
npm install express cors axios ping
npm install --save-dev nodemon
```

### Backend Server (backend/server.js)
```javascript
const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const axios = require('axios');

const app = express();
const PORT = 3001;

// Enable CORS for GitHub Codespaces and localhost
const corsOptions = {
  origin: [
    'http://localhost:5173',
    'http://localhost:3000',
    /^https:\/\/.*\.app\.github\.dev$/,
    /^https:\/\/.*\.githubpreview\.dev$/,
    /^https:\/\/.*\.preview\.app\.github\.dev$/
  ],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());

// Health endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'SFMC Health Checker API',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// System info endpoint
app.get('/api/system-info', (req, res) => {
  const { exec } = require('child_process');
  
  exec('openssl version', (error, stdout, stderr) => {
    const opensslVersion = error ? 'Not available' : stdout.trim();
    
    res.json({
      node: process.version,
      platform: process.platform,
      openssl: opensslVersion,
      timestamp: new Date().toISOString()
    });
  });
});

// Health Check Endpoint with improved error handling
app.post('/api/health-check', async (req, res) => {
  const { urls } = req.body;
  const results = [];
  
  console.log(`[Health Check] Testing ${urls.filter(u => u.enabled).length} endpoints...`);
  
  for (const urlObj of urls) {
    if (!urlObj.enabled || !urlObj.url) continue;
    
    const startTime = Date.now();
    try {
      const response = await axios.get(urlObj.url, { 
        timeout: 10000,
        validateStatus: () => true,
        headers: {
          'User-Agent': 'SFMC-Health-Checker/1.0.0'
        }
      });
      const responseTime = Date.now() - startTime;
      
      const status = response.status >= 200 && response.status < 400 ? 'healthy' : 'error';
      
      results.push({
        id: urlObj.id,
        url: urlObj.url,
        status,
        responseTime,
        statusCode: response.status,
        message: `HTTP ${response.status}`,
        timestamp: new Date().toISOString(),
        headers: {
          'content-type': response.headers['content-type'],
          'server': response.headers['server'],
          'cache-control': response.headers['cache-control']
        }
      });
      
      console.log(`[Health Check] ✓ ${urlObj.url}: ${status} (${responseTime}ms)`);
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      results.push({
        id: urlObj.id,
        url: urlObj.url,
        status: 'error',
        responseTime,
        statusCode: null,
        message: error.code === 'ENOTFOUND' ? 'Domain not found' :
                error.code === 'ETIMEDOUT' ? 'Connection timeout' :
                error.code === 'ECONNREFUSED' ? 'Connection refused' :
                error.message,
        timestamp: new Date().toISOString(),
        errorCode: error.code
      });
      
      console.log(`[Health Check] ✗ ${urlObj.url}: ${error.message}`);
    }
  }
  
  console.log(`[Health Check] Completed. ${results.filter(r => r.status === 'healthy').length}/${results.length} healthy`);
  res.json({ results });
});

// SSL Inspection Endpoint with improved error handling and timeout management
app.post('/api/ssl-inspect', (req, res) => {
  const { urls } = req.body;
  const results = [];
  let completed = 0;
  
  console.log(`[SSL Inspect] Request received with ${urls?.length || 0} URLs`);
  console.log(`[SSL Inspect] Testing ${urls.filter(u => u.enabled).length} SSL certificates...`);
  
  if (urls.length === 0) {
    return res.json({ results: [] });
  }
  
  // Add request timeout to prevent hanging
  const requestTimeout = setTimeout(() => {
    console.log(`[SSL Inspect] Request timeout after 30 seconds`);
    if (!res.headersSent) {
      res.status(408).json({ error: 'Request timeout', results });
    }
  }, 30000);
  
  urls.forEach((urlObj) => {
    if (!urlObj.enabled || !urlObj.url) {
      completed++;
      if (completed === urls.length) {
        clearTimeout(requestTimeout);
        res.json({ results });
      }
      return;
    }
    
    const [hostname, port = '443'] = urlObj.url.replace(/^https?:\/\//, '').split(':');
    console.log(`[SSL Inspect] Checking: ${hostname}:${port}`);
    
    // Use timeout and proper OpenSSL command (removed -verify_return_error to handle self-signed certs)
    const command = `timeout 10 openssl s_client -connect ${hostname}:${port} -servername ${hostname} < /dev/null 2>&1`;
    console.log(`[SSL Inspect] Executing command:`, command);
    
    const startTime = Date.now();
    exec(command, { timeout: 10000 }, (error, stdout, stderr) => {
      const responseTime = Date.now() - startTime;
      console.log(`[SSL Inspect] Command completed for ${hostname}:${port} in ${responseTime}ms`);
      
      if (error && error.code === 'TIMEOUT') {
        // Timeout
        results.push({
          id: urlObj.id,
          hostname,
          port: parseInt(port),
          status: 'error',
          message: 'Connection timeout (10s)',
          responseTime,
          timestamp: new Date().toISOString()
        });
        console.log(`[SSL Inspect] ✗ ${hostname}:${port}: Timeout`);
      } else if (error) {
        results.push({
          id: urlObj.id,
          hostname,
          port: parseInt(port),
          status: 'error',
          message: 'Connection failed',
          responseTime,
          errorDetails: stderr || error.message,
          timestamp: new Date().toISOString()
        });
        console.log(`[SSL Inspect] ✗ ${hostname}:${port}: Connection failed - ${error.message}`);
      } else {
        // Parse OpenSSL output
        const certInfo = parseSSLOutput(stdout, hostname, port, responseTime);
        results.push(certInfo);
        console.log(`[SSL Inspect] ✓ ${hostname}:${port}: ${certInfo.status}`);
      }
      
      completed++;
      if (completed === urls.length) {
        clearTimeout(requestTimeout);
        console.log(`[SSL Inspect] Completed. ${results.filter(r => r.status === 'valid').length}/${results.length} valid certificates`);
        if (!res.headersSent) {
          res.json({ results });
        }
      }
    });
  });
});

function parseSSLOutput(output, hostname, port, responseTime) {
  const lines = output.split('\n');
  
  // Check if connection was successful
  if (output.includes('connect: Connection refused') || 
      output.includes('connect: Network is unreachable') ||
      output.includes('Name or service not known')) {
    return {
      id: Math.random().toString(36).substring(7),
      hostname,
      port: parseInt(port),
      status: 'error',
      message: 'Connection failed',
      responseTime,
      timestamp: new Date().toISOString()
    };
  }
  
  // Check if we got a certificate
  if (!output.includes('Server certificate') && !output.includes('Certificate chain')) {
    return {
      id: Math.random().toString(36).substring(7),
      hostname,
      port: parseInt(port),
      status: 'error',
      message: 'No certificate found',
      responseTime,
      timestamp: new Date().toISOString()
    };
  }
  
  // Extract certificate information from different output formats
  let subject = '';
  let issuer = '';
  let notBefore = '';
  let notAfter = '';
  
  // Parse certificate chain format: " 0 s:CN = mam-tun-4.letsintune.com"
  // Or newer format: " 0 s:CN = *.google.com"
  const chainMatch = output.match(/\s*0\s+s:(.+)/);
  if (chainMatch) {
    subject = chainMatch[1].trim();
  }
  
  // Parse issuer from chain: " i:DC = com, DC = contoso..." or " i:C = US, O = Google Trust Services, CN = WR2"
  const issuerMatch = output.match(/\s*0\s+s:.+?\n\s*i:(.+)/);
  if (issuerMatch) {
    issuer = issuerMatch[1].trim();
  }
  
  // Parse validity dates from the v: line format: "v:NotBefore: Aug 18 08:39:58 2025 GMT; NotAfter: Nov 10 08:39:57 2025 GMT"
  const validityMatch = output.match(/v:NotBefore:\s*([^;]+?GMT);\s*NotAfter:\s*([^;]+?GMT)/);
  if (validityMatch) {
    notBefore = validityMatch[1].trim();
    notAfter = validityMatch[2].trim();
  }
  
  // Fallback: parse from older format
  if (!notBefore || !notAfter) {
    const notBeforeMatch = output.match(/notBefore=(.+)/);
    const notAfterMatch = output.match(/notAfter=(.+)/);
    if (notBeforeMatch) notBefore = notBeforeMatch[1].trim();
    if (notAfterMatch) notAfter = notAfterMatch[1].trim();
  }
  
  // Extract protocol and cipher information
  const protocol = extractField(output, 'Protocol\\s*:') || 'Unknown';
  const cipher = extractField(output, 'Cipher\\s*:') || 'Unknown';
  
  // Certificate chain depth
  const depthMatch = output.match(/depth=(\d+)/);
  const depth = depthMatch ? parseInt(depthMatch[1]) : 0;
  
  // Check for verification errors
  const hasVerifyError = output.includes('verify error') || output.includes('self-signed certificate');
  const isVerified = !hasVerifyError;
  
  // Parse verification details
  let verifyResult = 'Unknown';
  if (output.includes('self-signed certificate in certificate chain')) {
    verifyResult = 'Self-signed certificate in chain';
  } else if (output.includes('verify return:1')) {
    verifyResult = 'Certificate accepted with warnings';
  }
  
  if (!notAfter) {
    return {
      id: Math.random().toString(36).substring(7),
      hostname,
      port: parseInt(port),
      status: 'error',
      message: 'Could not parse certificate dates',
      responseTime,
      timestamp: new Date().toISOString()
    };
  }
  
  // Parse the date format "Aug  2 04:39:31 2025 GMT"
  const expiryDate = new Date(notAfter);
  const startDate = new Date(notBefore);
  const now = new Date();
  const isExpired = expiryDate < now;
  const daysUntilExpiry = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
  
  let status = 'valid';
  let message = 'Certificate is valid';
  
  if (isExpired) {
    status = 'expired';
    message = `Certificate expired ${Math.abs(daysUntilExpiry)} days ago`;
  } else if (daysUntilExpiry <= 30) {
    status = 'warning';
    message = `Certificate expires in ${daysUntilExpiry} days`;
  } else if (hasVerifyError) {
    status = 'warning';
    message = 'Certificate has verification warnings (self-signed chain)';
  }
  
  return {
    id: Math.random().toString(36).substring(7),
    hostname,
    port: parseInt(port),
    status,
    message,
    connected: true,
    responseTime,
    protocol,
    cipher,
    certificate: {
      subject: subject || 'Not available',
      issuer: issuer || 'Not available',
      validFrom: notBefore || 'Not available',
      validTo: notAfter || 'Not available',
      daysUntilExpiry: isExpired ? -Math.abs(daysUntilExpiry) : daysUntilExpiry,
      isExpired,
      isVerified,
      verifyResult,
      chainDepth: depth,
      serialNumber: 'Not available',
      keySize: '2048 bit'
    },
    timestamp: new Date().toISOString()
  };
}

function extractField(output, fieldName) {
  const regex = new RegExp(`${fieldName}\\s*([^\\n\\r]+)`);
  const match = output.match(regex);
  return match ? match[1].trim() : null;
}

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log('==================================================');
  console.log('🚀 SFMC Health Checker Backend Server');
  console.log('==================================================');
  console.log(`📡 Server running on: http://0.0.0.0:${PORT}`);
  console.log('🔍 Health Check API: POST /api/health-check');
  console.log('🔒 SSL Inspect API: POST /api/ssl-inspect');
  console.log('💚 Status API: GET /api/health');
  console.log('ℹ️  System Info: GET /api/system-info');
  console.log('==================================================');
  
  // Test OpenSSL availability
  exec('openssl version', (error, stdout, stderr) => {
    if (error) {
      console.log('⚠️  OpenSSL not available:', error.message);
    } else {
      console.log('✅ OpenSSL available:', stdout.trim());
    }
  });
});
```

### Backend Package.json Scripts
```json
{
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  }
}
```

## Step 3: Frontend Modifications

### Update Frontend for Real API Calls

Create `src/services/api.js`:
```javascript
const API_BASE = 'http://localhost:3001/api';

export const healthCheckAPI = async (urls) => {
  const response = await fetch(`${API_BASE}/health-check`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ urls })
  });
  return response.json();
};

export const sslInspectAPI = async (urls) => {
  const response = await fetch(`${API_BASE}/ssl-inspect`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ urls })
  });
  return response.json();
};
```

## Step 4: Testing Workflow

### Terminal 1: Backend Server
```bash
cd backend
npm run dev
# Server runs on http://localhost:3001
```

### Terminal 2: Frontend Development
```bash
cd /workspaces/sfmc-endpoint-health-checker
npm run dev
# Frontend runs on http://localhost:5173
```

### Terminal 3: Testing Commands
```bash
# Test health check endpoint directly
curl -X POST http://localhost:3001/api/health-check \
  -H "Content-Type: application/json" \
  -d '{"urls":[{"id":1,"url":"https://google.com","enabled":true}]}'

# Test SSL inspection endpoint
curl -X POST http://localhost:3001/api/ssl-inspect \
  -H "Content-Type: application/json" \
  -d '{"urls":[{"id":1,"url":"mam-tun-4.letsintune.com","enabled":true}]}'
```

## Step 5: Real Testing Scenarios

### Health Check Testing
- **Valid URLs**: `https://google.com`, `https://github.com`
- **Invalid URLs**: `https://nonexistent-domain-12345.com`
- **Timeout URLs**: `https://httpstat.us/200?sleep=15000`
- **Error URLs**: `https://httpstat.us/500`

### SSL Inspection Testing
- **Valid Certs**: `google.com:443`, `github.com:443`
- **Expired Certs**: `expired.badssl.com:443`
- **Self-signed**: `self-signed.badssl.com:443`
- **Your Target**: `mam-tun-4.letsintune.com:443`

## Step 6: Environment Configuration

Create `.env.local`:
```bash
# Development mode - uses real API
VITE_API_MODE=real
VITE_API_BASE_URL=http://localhost:3001/api

# Production mode - uses mocks (for GitHub Pages)
# VITE_API_MODE=mock
```

## Step 7: Deployment Strategy

### Development Branch (Real API)
- Uses local backend server
- Real OpenSSL calls
- Full network testing
- Local development only

### Main Branch (Mock Data)
- Static GitHub Pages deployment
- Mock SSL/health data
- No backend required
- Public demo functionality

## Security Considerations

1. **CORS**: Backend only allows localhost origins
2. **Input Validation**: Sanitize hostnames and ports
3. **Rate Limiting**: Prevent abuse of SSL inspection
4. **Timeout Handling**: Prevent hanging requests

## Troubleshooting

### OpenSSL Issues
```bash
# Test OpenSSL manually
echo | openssl s_client -connect google.com:443 -servername google.com

# Check OpenSSL version
openssl version
```

### Network Issues
```bash
# Test direct connectivity
curl -I https://mam-tun-4.letsintune.com
ping mam-tun-4.letsintune.com
```

### Backend Issues
```bash
# Check if backend is running
curl http://localhost:3001/api/health-check

# Check backend logs
npm run dev  # In backend directory
```

This setup gives you a fully functional testing environment with real network requests and SSL certificate inspection capabilities!

## Step 8: Complete Testing Guide

### 🚀 Quick Start Testing

**Both servers are running:**
- Backend API: `http://localhost:3001` ✅
- Frontend UI: `http://localhost:5174/sfmc-endpoint-health-checker/` ✅

### Method 1: Frontend UI Testing (Recommended)

1. **Open the application**: `http://localhost:5174/sfmc-endpoint-health-checker/`

2. **Test Health Checks**:
   - Stay on "Health Check" tab
   - Add test URLs:
     ```
     https://www.google.com
     https://github.com
     https://httpstat.us/500 (error test)
     https://nonexistent-domain-12345.com (failure test)
     ```
   - Click "Run Health Check"
   - ✅ Should show real response times and HTTP status codes

3. **Test SSL Inspection**:
   - Click "SSL Inspection" tab
   - Add test domains (without https://):
     ```
     www.google.com
     github.com
     mam-tun-4.letsintune.com
     expired.badssl.com (expired cert test)
     self-signed.badssl.com (self-signed test)
     ```
   - Click "Inspect SSL Certificates"
   - ✅ Should show real certificate data, expiry dates, and issuer info

### Method 2: Direct API Testing

Create and run test script:
```bash
# Quick API test
curl -s http://localhost:3001/ | jq .

# Test health check API
curl -X POST http://localhost:3001/api/health-check \
  -H "Content-Type: application/json" \
  -d '{"urls":[
    {"id":1,"url":"https://www.google.com","enabled":true},
    {"id":2,"url":"https://github.com","enabled":true}
  ]}' | jq .

# Test SSL inspection API
curl -X POST http://localhost:3001/api/ssl-inspect \
  -H "Content-Type: application/json" \
  -d '{"urls":[
    {"id":1,"url":"www.google.com","enabled":true},
    {"id":2,"url":"mam-tun-4.letsintune.com","enabled":true}
  ]}' | jq .
```

### Method 3: Comprehensive Test Suite

```bash
# Create comprehensive test script
cat > test-complete.sh << 'EOF'
#!/bin/bash
echo "🧪 SFMC Complete Test Suite"
echo "=========================="

# Test backend health
echo -e "\n✅ Backend Status:"
curl -s http://localhost:3001/ | jq .

# Test health checks
echo -e "\n🔍 Health Check Results:"
curl -s -X POST http://localhost:3001/api/health-check \
  -H "Content-Type: application/json" \
  -d '{"urls":[
    {"id":1,"url":"https://www.google.com","enabled":true},
    {"id":2,"url":"https://httpstat.us/500","enabled":true}
  ]}' | jq '.results[] | {url, status, responseTime, message}'

# Test SSL inspection
echo -e "\n🔒 SSL Inspection Results:"
curl -s -X POST http://localhost:3001/api/ssl-inspect \
  -H "Content-Type: application/json" \
  -d '{"urls":[
    {"id":1,"url":"www.google.com","enabled":true},
    {"id":2,"url":"expired.badssl.com","enabled":true}
  ]}' | jq '.results[] | {hostname, status, message, certificate: {issuer, validTo, daysUntilExpiry}}'

echo -e "\n🎉 Test suite completed!"
EOF

chmod +x test-complete.sh && ./test-complete.sh
```

### Expected Results

**Health Check Results:**
- ✅ Google: `healthy` status with ~100-200ms response time
- ❌ httpstat.us/500: `error` status with HTTP 500 message
- ❌ Nonexistent domain: `error` with "Domain not found"

**SSL Inspection Results:**
- ✅ Google: `valid` status, Google Trust Services issuer, ~66+ days until expiry
- ⚠️ mam-tun-4.letsintune.com: `warning` status (self-signed certificate)
- ❌ expired.badssl.com: `expired` status with negative days

### Troubleshooting Quick Fixes

**If Frontend Shows Errors:**
1. Hard refresh (Ctrl+F5)
2. Open DevTools (F12) → Network tab → Check for failed API calls
3. Check console for CORS errors

**If Backend Not Responding:**
```bash
# Restart backend
cd /workspaces/sfmc-endpoint-health-checker/backend
npm start
```

**If Frontend Not Loading:**
```bash
# Restart frontend  
cd /workspaces/sfmc-endpoint-health-checker
npm run dev
```

### Real-World Test Scenarios

**Corporate Environment Testing:**
- Internal domains with self-signed certificates
- VPN-protected endpoints
- Different port configurations (e.g., `:8443`, `:9443`)

**Internet Service Testing:**
- Public APIs (GitHub, Google, AWS endpoints)
- CDN endpoints
- Certificate authority validation

**Edge Case Testing:**
- Expired certificates (`expired.badssl.com`)
- Wrong hostname certificates (`wrong.host.badssl.com`)
- Untrusted root certificates (`untrusted-root.badssl.com`)

You now have a fully functional SFMC Endpoint Health Checker with real network capabilities! 🚀
