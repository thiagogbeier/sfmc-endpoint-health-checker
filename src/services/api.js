// API service for real backend communication
const API_BASE = 'http://localhost:3001/api';

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
    const response = await fetch(`${API_BASE}/ssl-inspect`, {
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
    console.error('SSL Inspect API Error:', error);
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
