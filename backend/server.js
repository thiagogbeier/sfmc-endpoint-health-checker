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
  
  console.log(`[Health Check] Testing ${urls.filter(u => u.enabled).length} URLs...`);
  
  for (const urlObj of urls) {
    if (!urlObj.enabled || !urlObj.url) continue;
    
    const startTime = Date.now();
    try {
      console.log(`[Health Check] Testing: ${urlObj.url}`);
      const response = await axios.get(urlObj.url, { 
        timeout: 10000,
        validateStatus: () => true,
        headers: {
          'User-Agent': 'SFMC-Health-Checker/1.0'
        }
      });
      const responseTime = Date.now() - startTime;
      
      const status = response.status < 400 ? 'healthy' : 
                    response.status < 500 ? 'warning' : 'error';
      
      results.push({
        id: urlObj.id,
        url: urlObj.url,
        status,
        responseTime,
        statusCode: response.status,
        message: `HTTP ${response.status} - ${response.statusText}`,
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

// SSL Inspection Endpoint
app.post('/api/ssl-inspect', (req, res) => {
  const { urls } = req.body;
  const results = [];
  let completed = 0;
  
  console.log(`[SSL Inspect] Testing ${urls.filter(u => u.enabled).length} SSL certificates...`);
  
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
    console.log(`[SSL Inspect] Checking: ${hostname}:${port}`);
    
    // Use timeout and proper OpenSSL command
    const command = `timeout 15 openssl s_client -connect ${hostname}:${port} -servername ${hostname} -verify_return_error < /dev/null 2>&1`;
    
    const startTime = Date.now();
    exec(command, (error, stdout, stderr) => {
      const responseTime = Date.now() - startTime;
      
      if (error && error.code === 124) {
        // Timeout
        results.push({
          id: urlObj.id,
          hostname,
          port: parseInt(port),
          status: 'error',
          message: 'Connection timeout (15s)',
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
        console.log(`[SSL Inspect] ✗ ${hostname}:${port}: Connection failed`);
      } else {
        // Parse OpenSSL output
        const certInfo = parseSSLOutput(stdout, hostname, port, responseTime);
        results.push(certInfo);
        console.log(`[SSL Inspect] ✓ ${hostname}:${port}: ${certInfo.status}`);
      }
      
      completed++;
      if (completed === urls.length) {
        console.log(`[SSL Inspect] Completed. ${results.filter(r => r.status === 'valid').length}/${results.length} valid certificates`);
        res.json({ results });
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
  
  // Extract certificate information
  const subject = extractField(output, 'subject=') || extractField(output, 's:');
  const issuer = extractField(output, 'issuer=') || extractField(output, 'i:');
  const notBefore = extractDateField(output, 'notBefore=');
  const notAfter = extractDateField(output, 'notAfter=');
  
  // Extract protocol and cipher information
  const protocol = extractField(output, 'Protocol\\s*:') || 'Unknown';
  const cipher = extractField(output, 'Cipher\\s*:') || 'Unknown';
  
  // Certificate chain depth
  const depthMatch = output.match(/depth=(\d+)/);
  const depth = depthMatch ? parseInt(depthMatch[1]) : 0;
  
  // Verification result
  const verifyResult = extractField(output, 'Verify return code:') || 'Unknown';
  const isVerified = verifyResult.includes('0 (ok)');
  
  if (!notAfter) {
    return {
      id: Math.random().toString(36).substring(7),
      hostname,
      port: parseInt(port),
      status: 'error',
      message: 'No certificate found or parsing failed',
      responseTime,
      timestamp: new Date().toISOString()
    };
  }
  
  const expiryDate = new Date(notAfter);
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
  } else if (!isVerified) {
    status = 'warning';
    message = 'Certificate verification failed';
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
      verifyResult: verifyResult,
      chainDepth: depth
    },
    timestamp: new Date().toISOString()
  };
}

function extractField(output, fieldName) {
  const regex = new RegExp(`${fieldName}\\s*([^\\n\\r]+)`, 'i');
  const match = output.match(regex);
  return match ? match[1].trim() : null;
}

function extractDateField(output, fieldName) {
  const field = extractField(output, fieldName);
  if (!field) return null;
  
  try {
    // Try to parse the date
    const date = new Date(field);
    return date.toISOString();
  } catch (e) {
    return field; // Return as-is if parsing fails
  }
}

// Health check for the API itself
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'SFMC Health Checker API',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Get system information
app.get('/api/system-info', (req, res) => {
  exec('openssl version', (error, stdout, stderr) => {
    const opensslVersion = error ? 'Not available' : stdout.trim();
    
    res.json({
      nodejs: process.version,
      openssl: opensslVersion,
      platform: process.platform,
      arch: process.arch,
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    });
  });
});

app.listen(PORT, () => {
  console.log('='.repeat(50));
  console.log('🚀 SFMC Health Checker Backend Server');
  console.log('='.repeat(50));
  console.log(`📡 Server running on: http://localhost:${PORT}`);
  console.log(`🔍 Health Check API: POST /api/health-check`);
  console.log(`🔒 SSL Inspect API: POST /api/ssl-inspect`);
  console.log(`💚 Status API: GET /api/health`);
  console.log(`ℹ️  System Info: GET /api/system-info`);
  console.log('='.repeat(50));
  
  // Test OpenSSL availability
  exec('openssl version', (error, stdout, stderr) => {
    if (error) {
      console.log('⚠️  WARNING: OpenSSL not found. SSL inspection will not work.');
      console.log('   Install OpenSSL: sudo apt-get install openssl');
    } else {
      console.log(`✅ OpenSSL available: ${stdout.trim()}`);
    }
  });
});
