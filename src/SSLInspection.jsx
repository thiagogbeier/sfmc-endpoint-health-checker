import React, { useState } from 'react'
import { sslInspectAPI } from './services/api.js'

export default function SSLInspection({ theme }) {
  const [urls, setUrls] = useState([
    { id: 1, url: '', enabled: true },
    { id: 2, url: '', enabled: false },
    { id: 3, url: '', enabled: false },
    { id: 4, url: '', enabled: false },
    { id: 5, url: '', enabled: false }
  ])
  const [isChecking, setIsChecking] = useState(false)
  const [results, setResults] = useState([])
  const [hasResults, setHasResults] = useState(false)

  // Mock SSL certificate data generator
  const generateMockSSLData = (hostname, port = 443) => {
    const now = new Date()
    const validFrom = new Date(now.getTime() - (Math.random() * 365 * 24 * 60 * 60 * 1000)) // Random date in past year
    const validTo = new Date(now.getTime() + (Math.random() * 365 * 24 * 60 * 60 * 1000)) // Random date in next year
    
    const isExpired = validTo < now
    const isExpiringSoon = (validTo - now) < (30 * 24 * 60 * 60 * 1000) // 30 days
    
    const cipherSuites = [
      'TLS_AES_256_GCM_SHA384',
      'TLS_CHACHA20_POLY1305_SHA256',
      'TLS_AES_128_GCM_SHA256',
      'ECDHE-RSA-AES256-GCM-SHA384',
      'ECDHE-RSA-CHACHA20-POLY1305'
    ]
    
    const protocols = ['TLSv1.3', 'TLSv1.2', 'TLSv1.1']
    
    return {
      hostname,
      port,
      connected: Math.random() > 0.1, // 90% success rate
      protocol: protocols[Math.floor(Math.random() * protocols.length)],
      cipher: cipherSuites[Math.floor(Math.random() * cipherSuites.length)],
      certificate: {
        subject: `CN=${hostname}, O=Example Corp, L=San Francisco, ST=CA, C=US`,
        issuer: 'CN=DigiCert Global Root CA, OU=www.digicert.com, O=DigiCert Inc, C=US',
        validFrom: validFrom.toISOString().split('T')[0],
        validTo: validTo.toISOString().split('T')[0],
        serialNumber: Math.random().toString(16).toUpperCase().substring(2, 18),
        fingerprint: Array.from({length: 20}, () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0')).join(':').toUpperCase(),
        keySize: Math.random() > 0.5 ? 2048 : 4096,
        signatureAlgorithm: 'sha256WithRSAEncryption',
        isExpired,
        isExpiringSoon: !isExpired && isExpiringSoon,
        daysUntilExpiry: Math.ceil((validTo - now) / (1000 * 60 * 60 * 24))
      },
      responseTime: Math.floor(Math.random() * 2000) + 100 // 100-2100ms
    }
  }

  const parseUrl = (url) => {
    try {
      // Remove protocol if present
      let cleanUrl = url.replace(/^https?:\/\//, '')
      
      // Split hostname and port
      const [hostname, port] = cleanUrl.split(':')
      
      return {
        hostname: hostname || url,
        port: parseInt(port) || 443
      }
    } catch {
      return {
        hostname: url,
        port: 443
      }
    }
  }

  const runSSLInspection = async () => {
    const validUrls = urls.filter(u => u.enabled && u.url.trim())
    
    if (validUrls.length === 0) {
      alert('Please enable and enter at least one URL to inspect.')
      return
    }

    setIsChecking(true)
    setResults([])
    setHasResults(false)

    try {
      // Call the real backend API
      const response = await sslInspectAPI(validUrls)
      
      // Map backend response to frontend format
      const mappedResults = response.results.map(result => ({
        id: result.id,
        url: validUrls.find(u => u.id === result.id)?.url || result.hostname,
        hostname: result.hostname,
        port: result.port,
        status: result.status,
        message: result.message,
        connected: result.connected || false,
        responseTime: result.responseTime,
        protocol: result.protocol,
        cipher: result.cipher,
        certificate: result.certificate,
        timestamp: result.timestamp
      }))
      
      setResults(mappedResults)
      setHasResults(true)
    } catch (error) {
      console.error('SSL inspection failed:', error)
      
      // Show error state
      const errorResults = validUrls.map(urlObj => ({
        id: urlObj.id,
        url: urlObj.url,
        hostname: urlObj.url.replace(/^https?:\/\//, '').split(':')[0],
        port: 443,
        status: 'error',
        message: `Backend error: ${error.message}`,
        connected: false,
        responseTime: 0,
        protocol: 'Unknown',
        cipher: 'Unknown',
        certificate: null,
        timestamp: new Date().toISOString()
      }))
      
      setResults(errorResults)
      setHasResults(true)
    } finally {
      setIsChecking(false)
    }
  }

  const updateUrl = (id, field, value) => {
    setUrls(prev => prev.map(url => 
      url.id === id ? { ...url, [field]: value } : url
    ))
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'valid': return '✅'
      case 'warning': return '⚠️'
      case 'expired': return '❌'
      case 'error': return '🔴'
      default: return '❓'
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'valid': return '#04844B'
      case 'warning': return '#FFB75D'
      case 'expired': case 'error': return '#EA001E'
      default: return '#666666'
    }
  }

  const exportResults = () => {
    if (!hasResults) return

    const timestamp = new Date().toLocaleString()
    const validResults = results.filter(r => r.connected)
    const failedResults = results.filter(r => !r.connected)
    
    let report = `SFMC SSL Inspection Report
Generated: ${timestamp}

=== SUMMARY ===
Total URLs Checked: ${results.length}
Successful Connections: ${validResults.length}
Failed Connections: ${failedResults.length}
Valid Certificates: ${results.filter(r => r.status === 'valid').length}
Expiring Soon: ${results.filter(r => r.status === 'warning').length}
Expired/Invalid: ${results.filter(r => r.status === 'expired' || r.status === 'error').length}

=== DETAILED RESULTS ===
`

    results.forEach((result, index) => {
      report += `
${index + 1}. ${result.url}
   Status: ${result.status.toUpperCase()}
   Connected: ${result.connected ? 'Yes' : 'No'}
   ${result.connected ? `
   Protocol: ${result.protocol}
   Cipher: ${result.cipher}
   Certificate Subject: ${result.certificate.subject}
   Valid From: ${result.certificate.validFrom}
   Valid To: ${result.certificate.validTo}
   Days Until Expiry: ${result.certificate.daysUntilExpiry}
   Key Size: ${result.certificate.keySize} bits
   Signature Algorithm: ${result.certificate.signatureAlgorithm}
   Serial Number: ${result.certificate.serialNumber}
   Fingerprint: ${result.certificate.fingerprint}
   Response Time: ${result.responseTime}ms` : `
   Error: Failed to establish SSL connection`}
`
    })

    // Copy to clipboard
    navigator.clipboard.writeText(report).then(() => {
      alert('SSL inspection report copied to clipboard!')
    }).catch(() => {
      // Fallback: download as file
      const blob = new Blob([report], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `ssl-inspection-${Date.now()}.txt`
      a.click()
      URL.revokeObjectURL(url)
    })
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: hasResults ? '1fr 1fr' : '1fr', gap: 30 }}>
      {/* Input Form */}
      <section style={{ 
        backgroundColor: theme.sectionBg, 
        padding: 30, 
        borderRadius: 12,
        border: `1px solid ${theme.border}`,
        height: 'fit-content'
      }}>
        <h2 style={{ color: '#0176D3', marginTop: 0, fontSize: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
          🔒 SSL Certificate Inspection
        </h2>
        
        <p style={{ color: theme.secondaryText, marginBottom: 25, lineHeight: 1.5 }}>
          Inspect SSL certificates for multiple endpoints. This tool simulates OpenSSL s_client connections 
          to analyze certificate validity, expiration dates, and connection security.
        </p>

        <div style={{ marginBottom: 25 }}>
          <h3 style={{ color: theme.primaryText, fontSize: 18, marginBottom: 15 }}>
            URLs to Inspect
          </h3>
          
          {urls.map((url, index) => (
            <div key={url.id} style={{ marginBottom: 15, display: 'flex', gap: 10, alignItems: 'center' }}>
              <input
                type="checkbox"
                checked={url.enabled}
                onChange={(e) => updateUrl(url.id, 'enabled', e.target.checked)}
                style={{ 
                  width: 18, 
                  height: 18,
                  accentColor: theme.primaryButton,
                  cursor: 'pointer'
                }}
              />
              <input
                type="text"
                placeholder={`Enter hostname${index === 0 ? ' (e.g., mam-tun-4.letsintune.com)' : ''}`}
                value={url.url}
                onChange={(e) => updateUrl(url.id, 'url', e.target.value)}
                disabled={!url.enabled || isChecking}
                style={{
                  flex: 1,
                  padding: '12px 15px',
                  border: `2px solid ${theme.inputBorder}`,
                  borderRadius: 8,
                  fontSize: 14,
                  backgroundColor: url.enabled && !isChecking ? theme.inputBg : theme.inputDisabled,
                  color: theme.primaryText,
                  outline: 'none',
                  transition: 'all 0.3s ease'
                }}
                onFocus={(e) => e.target.style.borderColor = theme.primaryButton}
                onBlur={(e) => e.target.style.borderColor = theme.inputBorder}
              />
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 15, flexWrap: 'wrap' }}>
          <button
            onClick={runSSLInspection}
            disabled={isChecking || !urls.some(u => u.enabled && u.url.trim())}
            style={{
              flex: 1,
              minWidth: 140,
              padding: '15px 25px',
              backgroundColor: isChecking ? theme.disabledButton : theme.primaryButton,
              color: '#ffffff',
              border: 'none',
              borderRadius: 8,
              fontSize: 16,
              fontWeight: 600,
              cursor: isChecking ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10
            }}
            onMouseOver={(e) => {
              if (!isChecking && urls.some(u => u.enabled && u.url.trim())) {
                e.target.style.backgroundColor = theme.primaryButtonHover
                e.target.style.transform = 'translateY(-2px)'
              }
            }}
            onMouseOut={(e) => {
              if (!isChecking) {
                e.target.style.backgroundColor = theme.primaryButton
                e.target.style.transform = 'translateY(0)'
              }
            }}
          >
            {isChecking ? (
              <>
                <span style={{ 
                  display: 'inline-block', 
                  width: 16, 
                  height: 16, 
                  border: '2px solid #ffffff', 
                  borderTop: '2px solid transparent', 
                  borderRadius: '50%', 
                  animation: 'spin 1s linear infinite' 
                }} />
                Inspecting...
              </>
            ) : (
              <>🔍 Run SSL Inspection</>
            )}
          </button>

          {hasResults && (
            <button
              onClick={exportResults}
              style={{
                padding: '15px 25px',
                backgroundColor: theme.secondaryButton,
                color: '#ffffff',
                border: 'none',
                borderRadius: 8,
                fontSize: 16,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}
              onMouseOver={(e) => {
                e.target.style.backgroundColor = '#E55A2B'
                e.target.style.transform = 'translateY(-2px)'
              }}
              onMouseOut={(e) => {
                e.target.style.backgroundColor = theme.secondaryButton
                e.target.style.transform = 'translateY(0)'
              }}
            >
              📋 Export Report
            </button>
          )}
        </div>

        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </section>

      {/* Results */}
      {hasResults && (
        <section style={{ 
          backgroundColor: theme.sectionBg, 
          padding: 30, 
          borderRadius: 12,
          border: `1px solid ${theme.border}`,
          height: 'fit-content'
        }}>
          <h2 style={{ color: '#0176D3', marginTop: 0, fontSize: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
            📊 SSL Inspection Results
          </h2>

          <div style={{ marginBottom: 25 }}>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
              gap: 15,
              marginBottom: 20
            }}>
              <div style={{ 
                padding: 15, 
                backgroundColor: theme.cardBg, 
                borderRadius: 8, 
                textAlign: 'center',
                border: `1px solid ${theme.border}`
              }}>
                <div style={{ fontSize: 24, fontWeight: 'bold', color: '#04844B' }}>
                  {results.filter(r => r.status === 'valid').length}
                </div>
                <div style={{ color: theme.secondaryText, fontSize: 12 }}>Valid</div>
              </div>
              <div style={{ 
                padding: 15, 
                backgroundColor: theme.cardBg, 
                borderRadius: 8, 
                textAlign: 'center',
                border: `1px solid ${theme.border}`
              }}>
                <div style={{ fontSize: 24, fontWeight: 'bold', color: '#FFB75D' }}>
                  {results.filter(r => r.status === 'warning').length}
                </div>
                <div style={{ color: theme.secondaryText, fontSize: 12 }}>Expiring Soon</div>
              </div>
              <div style={{ 
                padding: 15, 
                backgroundColor: theme.cardBg, 
                borderRadius: 8, 
                textAlign: 'center',
                border: `1px solid ${theme.border}`
              }}>
                <div style={{ fontSize: 24, fontWeight: 'bold', color: '#EA001E' }}>
                  {results.filter(r => r.status === 'expired' || r.status === 'error').length}
                </div>
                <div style={{ color: theme.secondaryText, fontSize: 12 }}>Failed</div>
              </div>
            </div>
          </div>

          <div style={{ maxHeight: 600, overflowY: 'auto' }}>
            {results.map((result, index) => (
              <div key={result.id} style={{ 
                marginBottom: 20, 
                padding: 20, 
                backgroundColor: theme.cardBg, 
                borderRadius: 8,
                border: `2px solid ${getStatusColor(result.status)}`,
                position: 'relative'
              }}>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  marginBottom: 15
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 20 }}>{getStatusIcon(result.status)}</span>
                    <span style={{ fontWeight: 'bold', color: theme.primaryText }}>
                      {result.url}
                    </span>
                  </div>
                  <span style={{ 
                    color: getStatusColor(result.status), 
                    fontWeight: 'bold',
                    fontSize: 12,
                    textTransform: 'uppercase'
                  }}>
                    {result.status}
                  </span>
                </div>

                {result.connected ? (
                  <div style={{ fontSize: 14, color: theme.secondaryText }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10, marginBottom: 10 }}>
                      <div><strong>Protocol:</strong> {result.protocol}</div>
                      <div><strong>Cipher:</strong> {result.cipher}</div>
                      <div><strong>Response Time:</strong> {result.responseTime}ms</div>
                      <div><strong>Key Size:</strong> {result.certificate.keySize} bits</div>
                    </div>
                    <div style={{ marginBottom: 10 }}>
                      <strong>Valid From:</strong> {result.certificate.validFrom} <br/>
                      <strong>Valid To:</strong> {result.certificate.validTo} 
                      <span style={{ 
                        color: result.certificate.isExpired ? '#EA001E' : 
                               result.certificate.isExpiringSoon ? '#FFB75D' : '#04844B',
                        fontWeight: 'bold',
                        marginLeft: 10
                      }}>
                        ({result.certificate.daysUntilExpiry} days {result.certificate.isExpired ? 'expired' : 'remaining'})
                      </span>
                    </div>
                    <div style={{ fontSize: 12, marginTop: 10, padding: 10, backgroundColor: theme.sectionBg, borderRadius: 4 }}>
                      <div><strong>Subject:</strong> {result.certificate.subject}</div>
                      <div><strong>Issuer:</strong> {result.certificate.issuer}</div>
                      <div><strong>Serial:</strong> {result.certificate.serialNumber}</div>
                      <div><strong>Fingerprint:</strong> {result.certificate.fingerprint}</div>
                    </div>
                  </div>
                ) : (
                  <div style={{ color: '#EA001E', fontSize: 14 }}>
                    ❌ Failed to establish SSL connection
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
