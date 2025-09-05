import React, { useState } from 'react'

export default function App() {
  // Form state
  const [endpoints, setEndpoints] = useState([
    { id: 1, url: 'https://mam-tun-4.letsintune.com', enabled: true },
    { id: 2, url: 'https://mstunnel.pat.td.com', enabled: true },
    { id: 3, url: 'https://mstunnel.td.com', enabled: true },
    { id: 4, url: '', enabled: false },
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

  // Mock health check function
  const runHealthCheck = async () => {
    const validEndpoints = getValidEndpoints()
    if (validEndpoints.length === 0) return

    setIsChecking(true)
    setResults([])
    
    // Simulate checking each endpoint
    const checkResults = []
    
    for (const endpoint of validEndpoints) {
      // Validate URL format
      const isValidUrl = /^https?:\/\/.+/.test(endpoint.url)
      
      if (!isValidUrl) {
        checkResults.push({
          id: endpoint.id,
          url: endpoint.url,
          status: 'error',
          responseTime: 0,
          message: 'Invalid URL format'
        })
        continue
      }

      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 300))
      
      // Mock response time (50-800ms)
      const responseTime = Math.floor(50 + Math.random() * 750)
      
      // Mock failure scenarios (20% failure rate)
      const shouldFail = Math.random() < 0.2
      
      let status, message
      
      if (shouldFail) {
        const errorTypes = [
          'Connection timeout',
          'DNS resolution failed', 
          'SSL certificate error',
          'HTTP 500 Internal Server Error',
          'HTTP 404 Not Found'
        ]
        status = 'error'
        message = errorTypes[Math.floor(Math.random() * errorTypes.length)]
      } else if (responseTime > responseThreshold) {
        status = 'warning'
        message = `High latency detected (>${responseThreshold}ms)`
      } else {
        status = 'healthy'
        message = 'Endpoint responding normally'
      }
      
      checkResults.push({
        id: endpoint.id,
        url: endpoint.url,
        status,
        responseTime: shouldFail ? 0 : responseTime,
        message
      })
    }
    
    setResults(checkResults)
    setHasResults(true)
    setIsChecking(false)
  }

  // Get enabled endpoints with valid URLs
  const getValidEndpoints = () => {
    return endpoints.filter(ep => ep.enabled && ep.url.trim())
  }

  return (
    <main style={{ maxWidth: 1000, margin: '20px auto', padding: 20, fontFamily: 'system-ui, sans-serif' }}>
      <header style={{ textAlign: 'center', marginBottom: 40 }}>
        <h1 style={{ color: '#0176D3', margin: 0 }}>SFMC Endpoint Health Checker</h1>
        <p style={{ color: '#666', margin: '8px 0 0 0' }}>
          Quick assessment tool for CSA engineers and managers
        </p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: hasResults ? '1fr 1fr' : '1fr', gap: 30 }}>
        {/* Input Form */}
        <section style={{ 
          backgroundColor: '#f9f9f9', 
          padding: 24, 
          borderRadius: 8,
          border: '1px solid #ddd'
        }}>
          <h2 style={{ marginTop: 0, color: '#333' }}>Endpoint Configuration</h2>
          
          {/* Endpoint URLs */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: 12 }}>
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
                    border: '1px solid #ccc',
                    borderRadius: 4,
                    backgroundColor: endpoint.enabled ? 'white' : '#f5f5f5'
                  }}
                />
              </div>
            ))}
          </div>

          {/* Basic Auth Toggle */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'flex', alignItems: 'center', fontWeight: 'bold' }}>
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
                    border: '1px solid #ccc',
                    borderRadius: 4 
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
                    border: '1px solid #ccc',
                    borderRadius: 4 
                  }}
                />
              </div>
            )}
          </div>

          {/* Response Time Threshold */}
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: 8 }}>
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
                border: '1px solid #ccc',
                borderRadius: 4
              }}
            />
            <span style={{ marginLeft: 8, color: '#666', fontSize: 14 }}>
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
              backgroundColor: isChecking ? '#666' : (getValidEndpoints().length > 0 ? '#0176D3' : '#ccc'),
              color: 'white',
              border: 'none',
              borderRadius: 4,
              fontSize: 16,
              fontWeight: 'bold',
              cursor: getValidEndpoints().length > 0 && !isChecking ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8
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
            backgroundColor: '#f9f9f9', 
            padding: 24, 
            borderRadius: 8,
            border: '1px solid #ddd'
          }}>
            <h2 style={{ marginTop: 0, color: '#333', marginBottom: 20 }}>Health Check Results</h2>
            
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
                    backgroundColor: 'white',
                    border: `2px solid ${getStatusColor(status)}`,
                    minWidth: 80,
                    textAlign: 'center'
                  }}>
                    <div style={{ 
                      fontWeight: 'bold', 
                      color: getStatusColor(status),
                      textTransform: 'capitalize'
                    }}>
                      {status}
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 'bold' }}>
                      {count} ({percentage}%)
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Results Table */}
            <div style={{ 
              backgroundColor: 'white',
              border: '1px solid #ddd',
              borderRadius: 4,
              overflow: 'hidden',
              marginBottom: 20
            }}>
              {/* Table Header */}
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: '40px 1fr 100px 120px',
                padding: 12,
                backgroundColor: '#f5f5f5',
                fontWeight: 'bold',
                borderBottom: '1px solid #ddd'
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
                  borderBottom: '1px solid #eee',
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
                    wordBreak: 'break-all'
                  }}>
                    {result.url}
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    {result.responseTime > 0 ? `${result.responseTime}ms` : 'N/A'}
                  </div>
                  <div style={{ 
                    fontSize: 12,
                    color: '#666'
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
                  backgroundColor: '#0176D3',
                  color: 'white',
                  border: 'none',
                  borderRadius: 4,
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                📋 Copy Report
              </button>
              <button
                onClick={downloadReport}
                style={{
                  padding: '10px 16px',
                  backgroundColor: '#FF6B35',
                  color: 'white',
                  border: 'none',
                  borderRadius: 4,
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                📥 Download Report
              </button>
            </div>
          </section>
        )}
      </div>

      <footer style={{ marginTop: 40, textAlign: 'center', color: '#666', fontSize: 14 }}>
        <p>
          SFMC Endpoint Health Checker MVP ✓ | 
          Built with React + Vite | 
          Sample data loaded | 
          Ready for CSA workshop demo
        </p>
        <p style={{ fontSize: 12, marginTop: 8 }}>
          Try the sample endpoints or add your own SFMC URLs to test the health checker
        </p>
      </footer>
    </main>
  )
}
