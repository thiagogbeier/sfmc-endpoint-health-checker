import React, { useState, useEffect } from 'react'
import SSLInspection from './SSLInspection.jsx'
import { healthCheckAPI } from './services/api.js'

export default function App() {
  // Navigation state
  const [currentPage, setCurrentPage] = useState('health-checker')

  // Theme state with persistence
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Check for saved theme preference or default to light mode
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('sfmc-health-checker-theme')
      if (savedTheme) {
        return savedTheme === 'dark'
      }
      // Check system preference
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
    }
    return false // Default to light mode if window is not available
  })

  // Save theme preference to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('sfmc-health-checker-theme', isDarkMode ? 'dark' : 'light')
      // Update body background to match theme
      document.body.style.backgroundColor = isDarkMode ? '#1a1a1a' : '#ffffff'
      document.body.style.transition = 'background-color 0.3s ease'
    }
  }, [isDarkMode])

  // Theme colors
  const theme = {
    // Background colors
    mainBg: isDarkMode ? '#1a1a1a' : '#ffffff',
    sectionBg: isDarkMode ? '#2d2d2d' : '#f9f9f9',
    cardBg: isDarkMode ? '#3a3a3a' : '#ffffff',
    
    // Text colors
    primaryText: isDarkMode ? '#ffffff' : '#333333',
    secondaryText: isDarkMode ? '#cccccc' : '#666666',
    
    // Border colors
    border: isDarkMode ? '#555555' : '#dddddd',
    headerBorder: '#0176D3', // Keep Salesforce blue consistent
    
    // Input colors
    inputBg: isDarkMode ? '#404040' : '#ffffff',
    inputDisabled: isDarkMode ? '#2a2a2a' : '#f5f5f5',
    inputBorder: isDarkMode ? '#666666' : '#cccccc',
    
    // Button colors
    primaryButton: '#0176D3',
    primaryButtonHover: '#0056a3',
    secondaryButton: '#FF6B35',
    disabledButton: isDarkMode ? '#555555' : '#cccccc'
  }

  // Form state
  const [endpoints, setEndpoints] = useState([
    { id: 1, url: 'https://mam-tun-1.letsintune.com', enabled: true },
    { id: 2, url: 'https://mam-tun-2.letsintune.com', enabled: true },
    { id: 3, url: 'https://mam-tun-3.letsintune.com', enabled: true },
    { id: 4, url: 'https://mam-tun-4.letsintune.com', enabled: true },
    { id: 5, url: '', enabled: false }
  ])
  const [authEnabled, setAuthEnabled] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [responseThreshold, setResponseThreshold] = useState(300)
  
  // Results state
  const [results, setResults] = useState([])
  const [isChecking, setIsChecking] = useState(false)
  const [hasResults, setHasResults] = useState(false)

  // Update endpoint URL
  const updateEndpoint = (id, url) => {
    setEndpoints(prev => prev.map(ep => 
      ep.id === id ? { ...ep, url } : ep
    ))
  }

  // Toggle endpoint enabled/disabled
  const toggleEndpoint = (id) => {
    setEndpoints(prev => prev.map(ep => 
      ep.id === id ? { ...ep, enabled: !ep.enabled } : ep
    ))
  }

  // Export functions
  const generateReport = () => {
    const timestamp = new Date().toLocaleString()
    const healthy = results.filter(r => r.status === 'healthy').length
    const warnings = results.filter(r => r.status === 'warning').length
    const errors = results.filter(r => r.status === 'error').length
    
    let report = `SFMC Endpoint Health Check Report\n`
    report += `Generated: ${timestamp}\n`
    report += `Response Threshold: ${responseThreshold}ms\n\n`
    
    report += `SUMMARY\n`
    report += `========\n`
    report += `Total Endpoints: ${results.length}\n`
    report += `Healthy: ${healthy} (${Math.round(healthy/results.length*100)}%)\n`
    report += `Warnings: ${warnings} (${Math.round(warnings/results.length*100)}%)\n`
    report += `Errors: ${errors} (${Math.round(errors/results.length*100)}%)\n\n`
    
    report += `DETAILED RESULTS\n`
    report += `================\n`
    results.forEach((result, index) => {
      const statusText = result.status.toUpperCase()
      const responseText = result.responseTime > 0 ? `${result.responseTime}ms` : 'N/A'
      
      report += `${index + 1}. ${result.url}\n`
      report += `   Status: ${statusText}\n`
      report += `   Response Time: ${responseText}\n`
      report += `   Message: ${result.message}\n\n`
    })
    
    return report
  }
  
  const copyToClipboard = async () => {
    const report = generateReport()
    try {
      await navigator.clipboard.writeText(report)
      alert('Report copied to clipboard!')
    } catch (err) {
      console.error('Failed to copy to clipboard:', err)
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = report
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      alert('Report copied to clipboard!')
    }
  }
  
  const downloadReport = () => {
    const report = generateReport()
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-')
    const filename = `sfmc-health-check-${timestamp}.txt`
    
    const blob = new Blob([report], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const clearResults = () => {
    setResults([])
    setHasResults(false)
  }

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'healthy': return '#04844B'
      case 'warning': return '#FFB75D'
      case 'error': return '#EA001E'
      default: return '#666'
    }
  }

  // Get status icon
  const getStatusIcon = (status) => {
    switch (status) {
      case 'healthy': return '✓'
      case 'warning': return '⚠'
      case 'error': return '✗'
      default: return '?'
    }
  }

  // Real health check function using backend API
  const runHealthCheck = async () => {
    const validEndpoints = getValidEndpoints()
    if (validEndpoints.length === 0) return

    setIsChecking(true)
    setResults([])
    
    try {
      console.log('🔍 Starting health check for:', validEndpoints);
      
      // Call the real backend API directly
      const response = await fetch('http://localhost:3001/api/health-check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ urls: validEndpoints })
      });

      console.log('📡 Health check response status:', response.status, response.statusText);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('✅ Health check API response:', data);
      
      // Map backend response to frontend format
      const mappedResults = data.results.map(result => ({
        id: result.id,
        url: result.url,
        status: result.status,
        responseTime: result.responseTime,
        message: result.message,
        statusCode: result.statusCode,
        timestamp: result.timestamp
      }))
      
      console.log('🎯 Mapped health results:', mappedResults);
      setResults(mappedResults)
      setHasResults(true)
    } catch (error) {
      console.error('❌ Health check failed:', error)
      
      // Show error state
      const errorResults = validEndpoints.map(endpoint => ({
        id: endpoint.id,
        url: endpoint.url,
        status: 'error',
        responseTime: 0,
        message: `Backend error: ${error.message}`,
        statusCode: null,
        timestamp: new Date().toISOString()
      }))
      
      setResults(errorResults)
      setHasResults(true)
    }
    
    setIsChecking(false)
  }

  // Get enabled endpoints with valid URLs
  const getValidEndpoints = () => {
    return endpoints.filter(ep => ep.enabled && ep.url.trim())
  }

  return (
    <main style={{ 
      maxWidth: 1000, 
      margin: '20px auto', 
      padding: 20, 
      fontFamily: 'system-ui, sans-serif',
      backgroundColor: theme.mainBg,
      color: theme.primaryText,
      minHeight: '100vh',
      transition: 'background-color 0.3s ease, color 0.3s ease'
    }}>
      <header style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        marginBottom: 40,
        padding: '20px 0',
        borderBottom: `2px solid ${theme.headerBorder}`,
        flexWrap: 'wrap',
        gap: 20
      }}>
        {/* Logo and Title Section */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, flex: 1 }}>
          {/* Logo */}
          <div style={{ 
            display: 'flex',
            alignItems: 'center',
            flexShrink: 0
          }}>
            <img 
              src="./logo.png" 
              alt="SFMC Logo" 
              style={{ 
                height: 48, 
                width: 'auto',
                objectFit: 'contain'
              }}
              onError={(e) => {
                // Fallback if logo doesn't exist - show a placeholder
                e.target.style.display = 'none'
                e.target.nextSibling.style.display = 'flex'
              }}
            />
            <div style={{ 
              display: 'none',
              width: 48,
              height: 48,
              backgroundColor: '#0176D3',
              borderRadius: 6,
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 'bold',
              fontSize: 16
            }}>
              SFMC
            </div>
          </div>
          
          {/* Title */}
          <div style={{ textAlign: 'left', flex: 1, minWidth: 300 }}>
            <h1 style={{ color: '#0176D3', margin: 0, fontSize: 28 }}>
              SFMC Endpoint Health Checker
            </h1>
            <p style={{ color: theme.secondaryText, margin: '8px 0 0 0', fontSize: 16 }}>
              Quick assessment tool for CSA engineers and managers
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            onClick={() => setCurrentPage('health-checker')}
            style={{
              padding: '10px 20px',
              borderRadius: 6,
              backgroundColor: currentPage === 'health-checker' ? theme.primaryButton : theme.cardBg,
              color: currentPage === 'health-checker' ? '#ffffff' : theme.primaryText,
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 500,
              transition: 'all 0.3s ease',
              border: `2px solid ${currentPage === 'health-checker' ? theme.primaryButton : theme.border}`
            }}
            onMouseOver={(e) => {
              if (currentPage !== 'health-checker') {
                e.target.style.backgroundColor = theme.sectionBg
              }
            }}
            onMouseOut={(e) => {
              if (currentPage !== 'health-checker') {
                e.target.style.backgroundColor = theme.cardBg
              }
            }}
          >
            🔍 Health Checker
          </button>
          <button
            onClick={() => setCurrentPage('ssl-inspection')}
            style={{
              padding: '10px 20px',
              borderRadius: 6,
              backgroundColor: currentPage === 'ssl-inspection' ? theme.primaryButton : theme.cardBg,
              color: currentPage === 'ssl-inspection' ? '#ffffff' : theme.primaryText,
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 500,
              transition: 'all 0.3s ease',
              border: `2px solid ${currentPage === 'ssl-inspection' ? theme.primaryButton : theme.border}`
            }}
            onMouseOver={(e) => {
              if (currentPage !== 'ssl-inspection') {
                e.target.style.backgroundColor = theme.sectionBg
              }
            }}
            onMouseOut={(e) => {
              if (currentPage !== 'ssl-inspection') {
                e.target.style.backgroundColor = theme.cardBg
              }
            }}
          >
            🔒 SSL Inspection
          </button>
        </nav>

        {/* Theme Toggle Button */}
        <button
          onClick={() => setIsDarkMode(!isDarkMode)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 50,
            height: 50,
            borderRadius: 25,
            border: `2px solid ${theme.border}`,
            backgroundColor: theme.cardBg,
            color: theme.primaryText,
            cursor: 'pointer',
            fontSize: 20,
            transition: 'all 0.3s ease',
            flexShrink: 0
          }}
          onMouseOver={(e) => {
            e.target.style.transform = 'scale(1.1)'
            e.target.style.backgroundColor = theme.sectionBg
          }}
          onMouseOut={(e) => {
            e.target.style.transform = 'scale(1)'
            e.target.style.backgroundColor = theme.cardBg
          }}
          title={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}
        >
          {isDarkMode ? '☀️' : '🌙'}
        </button>
      </header>

      {/* Page Content */}
      {currentPage === 'health-checker' ? (
        <div style={{ display: 'grid', gridTemplateColumns: hasResults ? '1fr 1fr' : '1fr', gap: 30 }}>
        {/* Input Form */}
        <section style={{ 
          backgroundColor: theme.sectionBg, 
          padding: 24, 
          borderRadius: 8,
          border: `1px solid ${theme.border}`,
          transition: 'background-color 0.3s ease, border-color 0.3s ease'
        }}>
          <h2 style={{ marginTop: 0, color: theme.primaryText }}>Endpoint Configuration</h2>
          
          {/* Endpoint URLs */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: 12, color: theme.primaryText }}>
              Endpoints to Check (max 5)
            </label>
            {endpoints.map((endpoint, index) => (
              <div key={endpoint.id} style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                <input
                  type="checkbox"
                  checked={endpoint.enabled}
                  onChange={() => toggleEndpoint(endpoint.id)}
                  style={{ marginRight: 8 }}
                />
                <input
                  type="url"
                  placeholder={`https://mc${index + 1}.salesforce.com/api/health`}
                  value={endpoint.url}
                  onChange={(e) => updateEndpoint(endpoint.id, e.target.value)}
                  disabled={!endpoint.enabled}
                  style={{
                    flex: 1,
                    padding: 8,
                    border: `1px solid ${theme.inputBorder}`,
                    borderRadius: 4,
                    backgroundColor: endpoint.enabled ? theme.inputBg : theme.inputDisabled,
                    color: theme.primaryText,
                    transition: 'background-color 0.3s ease, border-color 0.3s ease'
                  }}
                />
              </div>
            ))}
          </div>

          {/* Basic Auth Toggle */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'flex', alignItems: 'center', fontWeight: 'bold', color: theme.primaryText }}>
              <input
                type="checkbox"
                checked={authEnabled}
                onChange={(e) => setAuthEnabled(e.target.checked)}
                style={{ marginRight: 8 }}
              />
              Enable Basic Authentication
            </label>
            
            {authEnabled && (
              <div style={{ marginTop: 12, paddingLeft: 24 }}>
                <input
                  type="text"
                  placeholder="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  style={{ 
                    width: '100%', 
                    padding: 8, 
                    marginBottom: 8,
                    border: `1px solid ${theme.inputBorder}`,
                    borderRadius: 4,
                    backgroundColor: theme.inputBg,
                    color: theme.primaryText,
                    transition: 'background-color 0.3s ease, border-color 0.3s ease'
                  }}
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ 
                    width: '100%', 
                    padding: 8,
                    border: `1px solid ${theme.inputBorder}`,
                    borderRadius: 4,
                    backgroundColor: theme.inputBg,
                    color: theme.primaryText,
                    transition: 'background-color 0.3s ease, border-color 0.3s ease'
                  }}
                />
              </div>
            )}
          </div>

          {/* Response Time Threshold */}
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: 8, color: theme.primaryText }}>
              Response Time Threshold (ms)
            </label>
            <input
              type="number"
              min="50"
              max="5000"
              value={responseThreshold}
              onChange={(e) => setResponseThreshold(Number(e.target.value))}
              style={{
                width: '120px',
                padding: 8,
                border: `1px solid ${theme.inputBorder}`,
                borderRadius: 4,
                backgroundColor: theme.inputBg,
                color: theme.primaryText,
                transition: 'background-color 0.3s ease, border-color 0.3s ease'
              }}
            />
            <span style={{ marginLeft: 8, color: theme.secondaryText, fontSize: 14 }}>
              Values above this will show as warnings
            </span>
          </div>

          {/* Check Button */}
          <button
            onClick={runHealthCheck}
            disabled={isChecking || getValidEndpoints().length === 0}
            style={{
              width: '100%',
              padding: 12,
              backgroundColor: isChecking ? theme.disabledButton : (getValidEndpoints().length > 0 ? theme.primaryButton : theme.disabledButton),
              color: 'white',
              border: 'none',
              borderRadius: 4,
              fontSize: 16,
              fontWeight: 'bold',
              cursor: getValidEndpoints().length > 0 && !isChecking ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              transition: 'background-color 0.3s ease'
            }}
            onMouseOver={(e) => {
              if (!isChecking && getValidEndpoints().length > 0) {
                e.target.style.backgroundColor = theme.primaryButtonHover
              }
            }}
            onMouseOut={(e) => {
              if (!isChecking && getValidEndpoints().length > 0) {
                e.target.style.backgroundColor = theme.primaryButton
              }
            }}
          >
            {isChecking && (
              <div style={{
                width: 16,
                height: 16,
                border: '2px solid #ffffff40',
                borderTop: '2px solid white',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }} />
            )}
            {isChecking ? 'Checking Endpoints...' : `Run Health Check (${getValidEndpoints().length} endpoints)`}
          </button>

          {/* CSS Animation for spinner */}
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </section>

        {/* Results Section */}
        {hasResults && (
          <section style={{ 
            backgroundColor: theme.sectionBg, 
            padding: 24, 
            borderRadius: 8,
            border: `1px solid ${theme.border}`,
            transition: 'background-color 0.3s ease, border-color 0.3s ease'
          }}>
            <h2 style={{ marginTop: 0, color: theme.primaryText, marginBottom: 20 }}>Health Check Results</h2>
            
            {/* Summary Stats */}
            <div style={{ 
              display: 'flex', 
              gap: 16, 
              marginBottom: 20,
              flexWrap: 'wrap'
            }}>
              {['healthy', 'warning', 'error'].map(status => {
                const count = results.filter(r => r.status === status).length
                const percentage = results.length > 0 ? Math.round(count/results.length*100) : 0
                return (
                  <div key={status} style={{
                    padding: '8px 12px',
                    borderRadius: 4,
                    backgroundColor: theme.cardBg,
                    border: `2px solid ${getStatusColor(status)}`,
                    minWidth: 80,
                    textAlign: 'center',
                    transition: 'background-color 0.3s ease'
                  }}>
                    <div style={{ 
                      fontWeight: 'bold', 
                      color: getStatusColor(status),
                      textTransform: 'capitalize'
                    }}>
                      {status}
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 'bold', color: theme.primaryText }}>
                      {count} ({percentage}%)
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Results Table */}
            <div style={{ 
              backgroundColor: theme.cardBg,
              border: `1px solid ${theme.border}`,
              borderRadius: 4,
              overflow: 'hidden',
              marginBottom: 20,
              transition: 'background-color 0.3s ease, border-color 0.3s ease'
            }}>
              {/* Table Header */}
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: '40px 1fr 100px 120px',
                padding: 12,
                backgroundColor: isDarkMode ? '#444444' : '#f5f5f5',
                fontWeight: 'bold',
                borderBottom: `1px solid ${theme.border}`,
                color: theme.primaryText
              }}>
                <div>Status</div>
                <div>Endpoint URL</div>
                <div>Response</div>
                <div>Message</div>
              </div>
              
              {/* Table Rows */}
              {results.map(result => (
                <div key={result.id} style={{ 
                  display: 'grid', 
                  gridTemplateColumns: '40px 1fr 100px 120px',
                  padding: 12,
                  borderBottom: `1px solid ${isDarkMode ? '#555555' : '#eeeeee'}`,
                  alignItems: 'center'
                }}>
                  <div style={{ 
                    color: getStatusColor(result.status),
                    fontSize: 18,
                    fontWeight: 'bold'
                  }}>
                    {getStatusIcon(result.status)}
                  </div>
                  <div style={{ 
                    fontFamily: 'monospace',
                    fontSize: 13,
                    wordBreak: 'break-all',
                    color: theme.primaryText
                  }}>
                    {result.url}
                  </div>
                  <div style={{ textAlign: 'center', color: theme.primaryText }}>
                    {result.responseTime > 0 ? `${result.responseTime}ms` : 'N/A'}
                  </div>
                  <div style={{ 
                    fontSize: 12,
                    color: theme.secondaryText
                  }}>
                    {result.message}
                  </div>
                </div>
              ))}
            </div>

            {/* Export Buttons */}
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={copyToClipboard}
                style={{
                  padding: '10px 16px',
                  backgroundColor: theme.primaryButton,
                  color: 'white',
                  border: 'none',
                  borderRadius: 4,
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  transition: 'background-color 0.3s ease'
                }}
                onMouseOver={(e) => e.target.style.backgroundColor = theme.primaryButtonHover}
                onMouseOut={(e) => e.target.style.backgroundColor = theme.primaryButton}
              >
                📋 Copy Report
              </button>
              <button
                onClick={downloadReport}
                style={{
                  padding: '10px 16px',
                  backgroundColor: theme.secondaryButton,
                  color: 'white',
                  border: 'none',
                  borderRadius: 4,
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  transition: 'background-color 0.3s ease'
                }}
                onMouseOver={(e) => e.target.style.backgroundColor = '#e55a28'}
                onMouseOut={(e) => e.target.style.backgroundColor = theme.secondaryButton}
              >
                📥 Download Report
              </button>
              <button
                onClick={clearResults}
                style={{
                  padding: '10px 16px',
                  backgroundColor: isDarkMode ? '#666666' : '#999999',
                  color: 'white',
                  border: 'none',
                  borderRadius: 4,
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  transition: 'background-color 0.3s ease'
                }}
                onMouseOver={(e) => e.target.style.backgroundColor = isDarkMode ? '#777777' : '#888888'}
                onMouseOut={(e) => e.target.style.backgroundColor = isDarkMode ? '#666666' : '#999999'}
              >
                🗑️ Clear Results
              </button>
            </div>
          </section>
        )}
      </div>
      ) : currentPage === 'ssl-inspection' ? (
        <SSLInspection theme={theme} />
      ) : null}

      <footer style={{ marginTop: 40, textAlign: 'center', color: theme.secondaryText, fontSize: 14 }}>
        <p>
          SFMC Endpoint Health Checker MVP ✓ | 
          Built with React + Vite | 
          Sample data loaded | 
          Ready for CSA workshop demo
        </p>
        <p style={{ fontSize: 12, marginTop: 8 }}>
          Try the sample endpoints or add your own tunnel URLs to test the health checker
        </p>
      </footer>
    </main>
  )
}
