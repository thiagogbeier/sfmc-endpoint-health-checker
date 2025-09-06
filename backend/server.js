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
    'http://localhost:5174',
    'http://localhost:3000',
    /^https:\/\/.*\.app\.github\.dev$/,
    /^https:\/\/.*\.githubpreview\.dev$/,
    /^https:\/\/.*\.preview\.app\.github\.dev$/
  ],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  credentials: false,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json());

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'SFMC Health Checker Backend API',
    version: '1.0.0',
    endpoints: {
      health: 'GET /api/health',
      systemInfo: 'GET /api/system-info',
      healthCheck: 'POST /api/health-check',
      sslInspect: 'POST /api/ssl-inspect'
    },
    frontend: 'http://localhost:5173/sfmc-endpoint-health-checker/',
    timestamp: new Date().toISOString()
  });
});

// Health endpoint
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

// SSL Inspection Function for single hostname
async function inspectSSLCertificate(hostname, port = 443) {
  return new Promise((resolve, reject) => {
    console.log(`[SSL Inspect] Checking: ${hostname}:${port}`);
    
    // Use timeout and proper OpenSSL command (removed -verify_return_error to handle self-signed certs)
    const command = `timeout 15 openssl s_client -connect ${hostname}:${port} -servername ${hostname} < /dev/null 2>&1`;
    
    const startTime = Date.now();
    exec(command, { timeout: 10000 }, (error, stdout, stderr) => {
      const responseTime = Date.now() - startTime;
      console.log(`[SSL Inspect] Command completed for ${hostname}:${port} in ${responseTime}ms`);
      
      if (error && error.code === 'TIMEOUT') {
        // Timeout
        resolve({
          hostname,
          port: parseInt(port),
          status: 'error',
          message: 'Connection timeout (10s)',
          connected: false,
          responseTime,
          timestamp: new Date().toISOString()
        });
      } else if (error) {
        resolve({
          hostname,
          port: parseInt(port),
          status: 'error',
          message: 'Connection failed',
          connected: false,
          responseTime,
          error: stderr || error.message,
          timestamp: new Date().toISOString()
        });
      } else {
        // Parse OpenSSL output
        const certInfo = parseSSLOutput(stdout, hostname, port, responseTime);
        resolve(certInfo);
      }
    });
  });
}

// SSL Inspection Endpoint
app.post('/api/ssl-inspect', (req, res) => {
  const { urls, hostname, port } = req.body;
  
  // Handle single hostname/port request (new format)
  if (hostname && port) {
    console.log(`[SSL Inspect] Single hostname request: ${hostname}:${port}`);
    
    inspectSSLCertificate(hostname, port)
      .then(result => {
        console.log(`[SSL Inspect] Result for ${hostname}:${port}:`, result.status);
        res.json(result);
      })
      .catch(error => {
        console.error(`[SSL Inspect] Error for ${hostname}:${port}:`, error.message);
        res.json({
          status: 'error',
          error: error.message,
          hostname,
          port,
          connected: false,
          responseTime: null
        });
      });
    return;
  }
  
  // Handle multiple URLs request (legacy format)
  const results = [];
  let completed = 0;
  
  console.log(`[SSL Inspect] Request received with ${urls?.length || 0} URLs`);
  
  if (!urls || urls.length === 0) {
    return res.json({ results: [] });
  }
  
  console.log(`[SSL Inspect] Testing ${urls.filter(u => u.enabled).length} SSL certificates...`);
  
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
    const command = `timeout 15 openssl s_client -connect ${hostname}:${port} -servername ${hostname} < /dev/null 2>&1`;
    
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
      verifyResult: verifyResult,
      chainDepth: depth,
      serialNumber: extractField(output, 'serial:') || 'Not available',
      keySize: extract2048KeySize(output)
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

function extract2048KeySize(output) {
  // Look for "a:PKEY: rsaEncryption, 2048 (bit)"
  const keyMatch = output.match(/a:PKEY:\s*\w+,\s*(\d+)\s*\(bit\)/);
  return keyMatch ? `${keyMatch[1]} bit` : 'Unknown';
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

app.listen(PORT, '0.0.0.0', () => {
  console.log('='.repeat(50));
  console.log('🚀 SFMC Health Checker Backend Server');
  console.log('='.repeat(50));
  console.log(`📡 Server running on: http://0.0.0.0:${PORT}`);
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
