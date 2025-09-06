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

app.use(cors());
app.use(express.json());

// Health Check Endpoint
app.post('/api/health-check', async (req, res) => {
  const { urls } = req.body;
  const results = [];
  
  for (const urlObj of urls) {
    if (!urlObj.enabled || !urlObj.url) continue;
    
    const startTime = Date.now();
    try {
      const response = await axios.get(urlObj.url, { 
        timeout: 10000,
        validateStatus: () => true 
      });
      const responseTime = Date.now() - startTime;
      
      results.push({
        id: urlObj.id,
        url: urlObj.url,
        status: response.status < 400 ? 'healthy' : 'error',
        responseTime,
        statusCode: response.status,
        message: `HTTP ${response.status}`,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      results.push({
        id: urlObj.id,
        url: urlObj.url,
        status: 'error',
        responseTime: Date.now() - startTime,
        statusCode: null,
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
  
  res.json({ results });
});

// SSL Inspection Endpoint
app.post('/api/ssl-inspect', (req, res) => {
  const { urls } = req.body;
  const results = [];
  let completed = 0;
  
  if (urls.length === 0) {
    return res.json({ results: [] });
  }
  
  urls.forEach((urlObj) => {
    if (!urlObj.enabled || !urlObj.url) {
      completed++;
      if (completed === urls.length) {
        res.json({ results });
      }
      return;
    }
    
    const [hostname, port = '443'] = urlObj.url.replace(/^https?:\/\//, '').split(':');
    const command = `echo | openssl s_client -connect ${hostname}:${port} -servername ${hostname} 2>/dev/null`;
    
    exec(command, (error, stdout, stderr) => {
      const startTime = Date.now();
      
      if (error) {
        results.push({
          id: urlObj.id,
          hostname,
          port: parseInt(port),
          status: 'error',
          message: 'Connection failed',
          timestamp: new Date().toISOString()
        });
      } else {
        // Parse OpenSSL output
        const certInfo = parseSSLOutput(stdout, hostname, port);
        results.push(certInfo);
      }
      
      completed++;
      if (completed === urls.length) {
        res.json({ results });
      }
    });
  });
});

function parseSSLOutput(output, hostname, port) {
  const lines = output.split('\n');
  const certSection = output.match(/-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/);
  
  if (!certSection) {
    return {
      hostname,
      port: parseInt(port),
      status: 'error',
      message: 'No certificate found',
      timestamp: new Date().toISOString()
    };
  }
  
  // Extract certificate details
  const subject = extractField(output, 'subject=');
  const issuer = extractField(output, 'issuer=');
  const notBefore = extractField(output, 'notBefore=');
  const notAfter = extractField(output, 'notAfter=');
  
  const expiryDate = new Date(notAfter);
  const now = new Date();
  const isExpired = expiryDate < now;
  const daysUntilExpiry = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
  
  let status = 'valid';
  if (isExpired) status = 'expired';
  else if (daysUntilExpiry <= 30) status = 'warning';
  
  return {
    hostname,
    port: parseInt(port),
    status,
    connected: true,
    certificate: {
      subject,
      issuer,
      validFrom: notBefore,
      validTo: notAfter,
      daysUntilExpiry,
      isExpired
    },
    timestamp: new Date().toISOString()
  };
}

function extractField(output, fieldName) {
  const regex = new RegExp(`${fieldName}([^\\n]+)`);
  const match = output.match(regex);
  return match ? match[1].trim() : 'Not found';
}

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
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
