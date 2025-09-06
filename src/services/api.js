// API service for real backend communication
// Auto-detect API base URL based on environment
const getApiBase = () => {
  // Force localhost for debugging
  console.log('Current location:', window.location.hostname);
  
  // In GitHub Codespaces, detect the forwarded port
  if (window.location.hostname.includes('.app.github.dev')) {
    // Replace the port 5173 with 3001 in the current URL
    const baseUrl = window.location.origin.replace('-5173.', '-3001.');
    console.log('Using Codespaces API base:', `${baseUrl}/api`);
    return `${baseUrl}/api`;
  }
  // Local development
  console.log('Using localhost API base:', 'http://localhost:3001/api');
  return 'http://localhost:3001/api';
};

const API_BASE = getApiBase();

export const healthCheckAPI = async (urls) => {
  try {
    const response = await fetch(`${API_BASE}/health-check`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ urls })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Health Check API Error:', error);
    throw new Error(`Backend connection failed: ${error.message}`);
  }
};

export const sslInspectAPI = async (urls) => {
  try {
    console.log('🔍 SSL Inspect API called with:', { urls, API_BASE });
    console.log('🌐 Making request to:', `${API_BASE}/ssl-inspect`);
    
    const response = await fetch(`${API_BASE}/ssl-inspect`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ urls })
    });
    
    console.log('📡 Response status:', response.status, response.statusText);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    console.log('✅ SSL Inspect API result:', result);
    return result;
  } catch (error) {
    console.error('❌ SSL Inspect API Error:', error);
    throw new Error(`Backend connection failed: ${error.message}`);
  }
};

export const getSystemInfo = async () => {
  try {
    const response = await fetch(`${API_BASE}/system-info`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('System Info API Error:', error);
    return null;
  }
};

export const checkBackendHealth = async () => {
  try {
    const response = await fetch(`${API_BASE}/health`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Backend Health Check Error:', error);
    return null;
  }
};
