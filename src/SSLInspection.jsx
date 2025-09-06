import { useState } from 'react'

export default function SSLInspection({ theme }) {
  const [urls, setUrls] = useState([
    { id: 1, url: 'mam-tun-4.letsintune.com', enabled: true },
    { id: 2, url: 'www.google.com', enabled: false },
    { id: 3, url: '', enabled: false }
  ])
  const [results, setResults] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const runSSLInspection = async () => {
    const validUrls = urls.filter(u => u.enabled && u.url.trim())
    
    if (validUrls.length === 0) {
      setError('Please add at least one enabled URL to inspect')
      return
    }

    setIsLoading(true)
    setError(null)
    setResults([])

    try {
      const inspectionPromises = validUrls.map(async (urlObj) => {
        const url = urlObj.url.trim()
        
        try {
          const response = await fetch(`/api/ssl-inspect`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
              hostname: url.replace(/^https?:\/\//, ''), 
              port: 443 
            }),
          })

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`)
          }

          const data = await response.json()
          return {
            id: urlObj.id,
            url,
            ...data
          }
        } catch (error) {
          return {
            id: urlObj.id,
            url,
            status: 'error',
            error: error.message,
            connected: false,
            responseTime: null
          }
        }
      })

      const inspectionResults = await Promise.all(inspectionPromises)
      setResults(inspectionResults)
    } catch (error) {
      setError(`SSL inspection failed: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  const addUrl = () => {
    const newId = Math.max(...urls.map(u => u.id)) + 1
    setUrls([...urls, { id: newId, url: '', enabled: true }])
  }

  const removeUrl = (id) => {
    setUrls(urls.filter(u => u.id !== id))
  }

  const updateUrl = (id, field, value) => {
    setUrls(urls.map(u => u.id === id ? { ...u, [field]: value } : u))
  }

  const exportResults = () => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const content = generateReport()
    
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ssl-inspection-${timestamp}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generateReport())
    } catch (err) {
      console.error('Failed to copy to clipboard:', err)
    }
  }

  const generateReport = () => {
    const timestamp = new Date().toLocaleString()
    const summary = `SSL Certificate Inspection Report
Generated: ${timestamp}

SUMMARY:
- Total URLs: ${results.length}
- Valid Certificates: ${validCount}
- Warnings: ${warningCount}
- Failed: ${errorCount}

DETAILED RESULTS:
${results.map(result => {
  return `
URL: ${result.url}
Status: ${result.status?.toUpperCase() || 'UNKNOWN'}
Response Time: ${result.responseTime ? `${result.responseTime}ms` : 'N/A'}
Connected: ${result.connected ? 'Yes' : 'No'}
${result.certificate ? `
Certificate Details:
- Subject: ${result.certificate.subject}
- Issuer: ${result.certificate.issuer}
- Valid From: ${result.certificate.validFrom}
- Valid To: ${result.certificate.validTo}
- Days Until Expiry: ${result.certificate.daysUntilExpiry}
- Key Size: ${result.certificate.keySize}
- Verified: ${result.certificate.isVerified ? 'Yes' : 'No'}
${!result.certificate.isVerified && result.certificate.verifyResult ? `- Verification Issue: ${result.certificate.verifyResult}` : ''}
` : result.error ? `Error: ${result.error}` : 'No certificate data'}
${'─'.repeat(50)}`
}).join('\n')}

End of Report`
    return summary
  }

  // Calculate summary statistics
  const validCount = results.filter(r => r.status === 'valid').length
  const warningCount = results.filter(r => r.status === 'warning').length
  const errorCount = results.filter(r => r.status === 'error').length
  const totalChecked = results.length

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ 
        background: theme.cardBg, 
        borderRadius: '12px', 
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)', 
        padding: '32px' 
      }}>
        <h2 style={{ 
          fontSize: '28px', 
          fontWeight: 'bold', 
          color: theme.primaryText, 
          marginBottom: '16px' 
        }}>
          🔒 SSL Certificate Inspection
        </h2>
        <p style={{ 
          color: theme.secondaryText, 
          marginBottom: '32px', 
          fontSize: '16px' 
        }}>
          Analyze SSL certificates for security compliance and expiration monitoring.
        </p>

        {error && (
          <div style={{
            background: theme.cardBg,
            border: '2px solid #fecaca',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <span style={{ fontSize: '20px' }}>❌</span>
            <div>
              <h4 style={{ 
                color: '#dc2626', 
                fontWeight: '600', 
                margin: '0 0 4px 0',
                fontSize: '16px' 
              }}>
                Error
              </h4>
              <p style={{ 
                color: '#991b1b', 
                margin: 0,
                fontSize: '14px' 
              }}>
                {error}
              </p>
            </div>
          </div>
        )}

        <div style={{ marginBottom: '32px' }}>
          <h3 style={{ 
            fontSize: '20px', 
            fontWeight: '600', 
            color: theme.primaryText, 
            marginBottom: '20px' 
          }}>
            URLs to Inspect
          </h3>
          {urls.map((urlObj) => (
            <div key={urlObj.id} style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '12px', 
              marginBottom: '16px' 
            }}>
              <input
                type="checkbox"
                checked={urlObj.enabled}
                onChange={(e) => updateUrl(urlObj.id, 'enabled', e.target.checked)}
                style={{ 
                  width: '18px', 
                  height: '18px', 
                  accentColor: '#3b82f6' 
                }}
              />
              <input
                type="text"
                value={urlObj.url}
                onChange={(e) => updateUrl(urlObj.id, 'url', e.target.value)}
                placeholder="Enter domain (e.g., example.com)"
                style={{ 
                  flex: 1, 
                  padding: '12px 16px', 
                  border: `2px solid ${theme.inputBorder}`, 
                  borderRadius: '8px', 
                  fontSize: '16px',
                  outline: 'none',
                  backgroundColor: theme.inputBg,
                  color: theme.primaryText
                }}
                onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                onBlur={(e) => e.target.style.borderColor = theme.inputBorder}
              />
              {urls.length > 1 && (
                <button
                  onClick={() => removeUrl(urlObj.id)}
                  style={{ 
                    padding: '12px 16px', 
                    color: '#dc2626', 
                    background: 'none', 
                    border: 'none', 
                    cursor: 'pointer',
                    fontWeight: '600',
                    fontSize: '16px'
                  }}
                  onMouseOver={(e) => e.target.style.color = '#b91c1c'}
                  onMouseOut={(e) => e.target.style.color = '#dc2626'}
                >
                  Remove
                </button>
              )}
            </div>
          ))}
          
          <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
            <button
              onClick={addUrl}
              style={{ 
                padding: '12px 20px', 
                background: theme.sectionBg, 
                color: theme.primaryText, 
                border: `1px solid ${theme.border}`, 
                borderRadius: '8px', 
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '16px'
              }}
              onMouseOver={(e) => e.target.style.background = theme.inputBg}
              onMouseOut={(e) => e.target.style.background = theme.sectionBg}
            >
              + Add URL
            </button>
            <button
              onClick={runSSLInspection}
              disabled={isLoading}
              style={{ 
                padding: '12px 24px', 
                background: isLoading ? theme.disabledButton : theme.primaryButton, 
                color: 'white', 
                border: 'none', 
                borderRadius: '8px', 
                cursor: isLoading ? 'not-allowed' : 'pointer',
                fontWeight: '600',
                fontSize: '16px'
              }}
              onMouseOver={(e) => {
                if (!isLoading) e.target.style.background = theme.primaryButtonHover
              }}
              onMouseOut={(e) => {
                if (!isLoading) e.target.style.background = theme.primaryButton
              }}
            >
              {isLoading ? '🔄 Inspecting...' : '🔍 Inspect SSL Certificates'}
            </button>
          </div>
        </div>

        {isLoading && (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            padding: '40px' 
          }}>
            <div style={{ 
              width: '32px', 
              height: '32px', 
              border: `3px solid ${theme.border}`, 
              borderTop: '3px solid #3b82f6', 
              borderRadius: '50%', 
              animation: 'spin 1s linear infinite' 
            }}></div>
            <span style={{ 
              marginLeft: '12px', 
              color: theme.secondaryText, 
              fontSize: '16px' 
            }}>
              Analyzing SSL certificates...
            </span>
          </div>
        )}

        {results.length > 0 && (
          <div style={{ marginBottom: '32px' }}>
            <h3 style={{ 
              fontSize: '20px', 
              fontWeight: '600', 
              color: theme.primaryText, 
              marginBottom: '20px' 
            }}>
              📊 Health Check Results
            </h3>

            <div style={{
              background: theme.sectionBg,
              border: `2px solid ${theme.border}`,
              borderRadius: '12px',
              padding: '24px',
              marginBottom: '24px'
            }}>
              <h4 style={{
                fontSize: '18px',
                fontWeight: '600',
                color: theme.primaryText,
                marginBottom: '16px'
              }}>
                SSL Inspection Summary
              </h4>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                gap: '16px',
                textAlign: 'center'
              }}>
                <div>
                  <div style={{
                    fontSize: '24px',
                    fontWeight: 'bold',
                    color: theme.primaryText
                  }}>
                    {totalChecked}
                  </div>
                  <div style={{
                    fontSize: '14px',
                    color: theme.secondaryText,
                    fontWeight: '500'
                  }}>
                    Total Checked
                  </div>
                </div>
                <div>
                  <div style={{
                    fontSize: '24px',
                    fontWeight: 'bold',
                    color: '#16a34a'
                  }}>
                    {validCount}
                  </div>
                  <div style={{
                    fontSize: '14px',
                    color: '#16a34a',
                    fontWeight: '500'
                  }}>
                    Valid ✅
                  </div>
                </div>
                <div>
                  <div style={{
                    fontSize: '24px',
                    fontWeight: 'bold',
                    color: '#ca8a04'
                  }}>
                    {warningCount}
                  </div>
                  <div style={{
                    fontSize: '14px',
                    color: '#ca8a04',
                    fontWeight: '500'
                  }}>
                    Warnings ⚠️
                  </div>
                </div>
                <div>
                  <div style={{
                    fontSize: '24px',
                    fontWeight: 'bold',
                    color: '#dc2626'
                  }}>
                    {errorCount}
                  </div>
                  <div style={{
                    fontSize: '14px',
                    color: '#dc2626',
                    fontWeight: '500'
                  }}>
                    Failed ❌
                  </div>
                </div>
              </div>
            </div>

            <div style={{ 
              display: 'grid', 
              gap: '16px' 
            }}>
              {results.map((result) => (
                <div key={result.id} style={{
                  border: '2px solid',
                  borderColor: result.status === 'valid' ? '#bbf7d0' : 
                              result.status === 'warning' ? '#fde047' : '#fecaca',
                  borderRadius: '12px',
                  padding: '24px',
                  background: theme.cardBg
                }}>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'flex-start', 
                    justifyContent: 'space-between' 
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '12px', 
                        marginBottom: '16px' 
                      }}>
                        <span style={{ fontSize: '24px' }}>
                          {result.status === 'valid' ? '✅' : 
                           result.status === 'warning' ? '⚠️' : '❌'}
                        </span>
                        <h4 style={{ 
                          fontWeight: '600', 
                          color: theme.primaryText,
                          fontSize: '18px',
                          margin: 0
                        }}>
                          {result.hostname || result.url}:{result.port || 443}
                        </h4>
                        <span style={{
                          padding: '6px 12px',
                          borderRadius: '20px',
                          fontSize: '12px',
                          fontWeight: '600',
                          background: result.status === 'valid' ? '#d1fae5' : 
                                    result.status === 'warning' ? '#fef3c7' : '#fee2e2',
                          color: result.status === 'valid' ? '#065f46' : 
                                result.status === 'warning' ? '#92400e' : '#991b1b'
                        }}>
                          {result.status?.toUpperCase() || 'ERROR'}
                        </span>
                      </div>
                      
                      <p style={{ 
                        color: theme.secondaryText, 
                        marginBottom: '20px',
                        fontSize: '16px'
                      }}>
                        {result.message || result.error || 'Certificate analysis completed'}
                      </p>
                      
                      <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
                        gap: '16px',
                        fontSize: '14px',
                        marginBottom: result.certificate ? '20px' : '0'
                      }}>
                        <div>
                          <span style={{ 
                            fontWeight: '600', 
                            color: theme.secondaryText 
                          }}>
                            Response Time:
                          </span>
                          <div style={{ 
                            color: theme.primaryText,
                            fontWeight: '500' 
                          }}>
                            {result.responseTime ? `${result.responseTime}ms` : 'N/A'}
                          </div>
                        </div>
                        <div>
                          <span style={{ 
                            fontWeight: '600', 
                            color: theme.secondaryText 
                          }}>
                            Connected:
                          </span>
                          <div style={{ 
                            color: theme.primaryText,
                            fontWeight: '500' 
                          }}>
                            {result.connected ? '✅ Yes' : '❌ No'}
                          </div>
                        </div>
                        {result.protocol && (
                          <div>
                            <span style={{ 
                              fontWeight: '600', 
                              color: theme.secondaryText 
                            }}>
                              Protocol:
                            </span>
                            <div style={{ 
                              color: theme.primaryText,
                              fontWeight: '500' 
                            }}>
                              {result.protocol}
                            </div>
                          </div>
                        )}
                        {result.cipher && (
                          <div>
                            <span style={{ 
                              fontWeight: '600', 
                              color: theme.secondaryText 
                            }}>
                              Cipher:
                            </span>
                            <div style={{ 
                              color: theme.primaryText,
                              fontWeight: '500' 
                            }}>
                              {result.cipher}
                            </div>
                          </div>
                        )}
                      </div>

                      {result.certificate && (
                        <div style={{ 
                          padding: '20px', 
                          background: theme.sectionBg, 
                          borderRadius: '8px', 
                          border: `1px solid ${theme.border}`,
                          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
                        }}>
                          <h5 style={{ 
                            fontWeight: '600', 
                            color: theme.primaryText, 
                            marginBottom: '16px',
                            fontSize: '16px'
                          }}>
                            Certificate Details
                          </h5>
                          <div style={{ 
                            display: 'grid', 
                            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
                            gap: '16px',
                            fontSize: '14px'
                          }}>
                            <div>
                              <span style={{ 
                                fontWeight: '600', 
                                color: theme.secondaryText 
                              }}>
                                Subject:
                              </span>
                              <div style={{ 
                                color: theme.primaryText,
                                wordBreak: 'break-all',
                                fontFamily: 'monospace',
                                fontSize: '12px',
                                marginTop: '4px'
                              }}>
                                {result.certificate.subject}
                              </div>
                            </div>
                            <div>
                              <span style={{ 
                                fontWeight: '600', 
                                color: theme.secondaryText 
                              }}>
                                Issuer:
                              </span>
                              <div style={{ 
                                color: theme.primaryText,
                                wordBreak: 'break-all',
                                fontFamily: 'monospace',
                                fontSize: '12px',
                                marginTop: '4px'
                              }}>
                                {result.certificate.issuer}
                              </div>
                            </div>
                            <div>
                              <span style={{ 
                                fontWeight: '600', 
                                color: theme.secondaryText 
                              }}>
                                Valid From:
                              </span>
                              <div style={{ 
                                color: theme.primaryText,
                                fontWeight: '500',
                                marginTop: '4px'
                              }}>
                                {result.certificate.validFrom}
                              </div>
                            </div>
                            <div>
                              <span style={{ 
                                fontWeight: '600', 
                                color: theme.secondaryText 
                              }}>
                                Valid To:
                              </span>
                              <div style={{ 
                                color: theme.primaryText,
                                fontWeight: '500',
                                marginTop: '4px'
                              }}>
                                {result.certificate.validTo}
                              </div>
                            </div>
                            <div>
                              <span style={{ 
                                fontWeight: '600', 
                                color: theme.secondaryText 
                              }}>
                                Days Until Expiry:
                              </span>
                              <div style={{ 
                                color: result.certificate.daysUntilExpiry < 30 ? '#dc2626' : theme.primaryText,
                                fontWeight: '600',
                                marginTop: '4px'
                              }}>
                                {result.certificate.daysUntilExpiry} days
                              </div>
                            </div>
                            <div>
                              <span style={{ 
                                fontWeight: '600', 
                                color: theme.secondaryText 
                              }}>
                                Key Size:
                              </span>
                              <div style={{ 
                                color: theme.primaryText,
                                fontWeight: '500',
                                marginTop: '4px'
                              }}>
                                {result.certificate.keySize}
                              </div>
                            </div>
                            <div>
                              <span style={{ 
                                fontWeight: '600', 
                                color: '#6b7280' 
                              }}>
                                Verified:
                              </span>
                              <div style={{ 
                                color: '#1f2937',
                                fontWeight: '500',
                                marginTop: '4px'
                              }}>
                                {result.certificate.isVerified ? '✅ Yes' : '❌ No'}
                              </div>
                            </div>
                            {!result.certificate.isVerified && result.certificate.verifyResult && (
                              <div style={{ gridColumn: '1 / -1' }}>
                                <span style={{ 
                                  fontWeight: '600', 
                                  color: '#6b7280' 
                                }}>
                                  Verification Issue:
                                </span>
                                <div style={{ 
                                  color: '#dc2626',
                                  fontWeight: '500',
                                  marginTop: '4px'
                                }}>
                                  {result.certificate.verifyResult}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ 
              marginTop: '24px',
              display: 'flex',
              gap: '12px'
            }}>
              <button
                onClick={exportResults}
                style={{ 
                  padding: '12px 20px', 
                  background: theme.secondaryButton, 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '8px', 
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '14px'
                }}
                onMouseOver={(e) => e.target.style.background = '#e55a2b'}
                onMouseOut={(e) => e.target.style.background = theme.secondaryButton}
              >
                📥 Export Results
              </button>
              <button
                onClick={copyToClipboard}
                style={{ 
                  padding: '12px 20px', 
                  background: theme.primaryButton, 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '8px', 
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '14px'
                }}
                onMouseOver={(e) => e.target.style.background = theme.primaryButtonHover}
                onMouseOut={(e) => e.target.style.background = theme.primaryButton}
              >
                📋 Copy to Clipboard
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
