import { useState } from 'react'

export default function BulkSSLInspection({ theme }) {
  const [uploadedUrls, setUploadedUrls] = useState([])
  const [results, setResults] = useState([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState({ current: 0, total: 0 })
  const [error, setError] = useState(null)

  const handleFileUpload = (event) => {
    const file = event.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const content = e.target.result
        let urls = []

        // Support multiple file formats
        if (file.name.endsWith('.json')) {
          const jsonData = JSON.parse(content)
          urls = Array.isArray(jsonData) ? jsonData : jsonData.urls || []
        } else if (file.name.endsWith('.csv')) {
          const lines = content.split('\n').filter(line => line.trim())
          urls = lines.map(line => line.split(',')[0].trim()).filter(url => url)
        } else {
          // Plain text - one URL per line
          urls = content.split('\n')
            .map(line => line.trim())
            .filter(line => line && !line.startsWith('#'))
        }

        // Validate URLs
        const validUrls = urls
          .map(url => {
            // Add https:// if no protocol specified
            if (!url.startsWith('http://') && !url.startsWith('https://')) {
              url = 'https://' + url
            }
            return url
          })
          .filter(url => {
            try {
              new URL(url)
              return true
            } catch {
              return false
            }
          })

        setUploadedUrls(validUrls.map((url, index) => ({
          id: index + 1,
          url: url,
          hostname: new URL(url).hostname
        })))
        setError(null)
        setResults([])
      } catch (err) {
        setError(`Failed to parse file: ${err.message}`)
      }
    }
    reader.readAsText(file)
  }

  const runBulkSSLInspection = async () => {
    if (uploadedUrls.length === 0) {
      setError('Please upload a file with URLs first')
      return
    }

    setIsProcessing(true)
    setError(null)
    setResults([])
    setProgress({ current: 0, total: uploadedUrls.length })

    const inspectionResults = []

    for (let i = 0; i < uploadedUrls.length; i++) {
      const urlObj = uploadedUrls[i]
      setProgress({ current: i + 1, total: uploadedUrls.length })

      try {
        const response = await fetch('/api/ssl-inspect', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            hostname: urlObj.hostname, 
            port: 443 
          }),
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        const data = await response.json()
        inspectionResults.push({
          ...urlObj,
          ...data,
          success: true
        })
      } catch (error) {
        console.error(`SSL inspection failed for ${urlObj.hostname}:`, error)
        inspectionResults.push({
          ...urlObj,
          id: Math.random().toString(36).substr(2, 6),
          status: 'error',
          message: `Failed to inspect: ${error.message}`,
          connected: false,
          success: false,
          responseTime: null,
          timestamp: new Date().toISOString()
        })
      }

      // Increase delay between requests to prevent server overload
      if (i < uploadedUrls.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    }

    setResults(inspectionResults)
    setIsProcessing(false)
  }

  const downloadResults = () => {
    const csvContent = [
      ['URL', 'Hostname', 'Status', 'Connected', 'Response Time', 'Certificate Subject', 'Issuer', 'Valid Until', 'Days Until Expiry', 'Message'].join(','),
      ...results.map(result => [
        result.url,
        result.hostname,
        result.status,
        result.connected ? 'Yes' : 'No',
        result.responseTime ? `${result.responseTime}ms` : 'N/A',
        result.certificate?.subject || 'N/A',
        result.certificate?.issuer || 'N/A',
        result.certificate?.validTo || 'N/A',
        result.certificate?.daysUntilExpiry || 'N/A',
        `"${result.message || 'N/A'}"`
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `bulk-ssl-inspection-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'valid': return '✅'
      case 'warning': return '⚠️'
      case 'error': return '❌'
      default: return '?'
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'valid': return '#04844B'
      case 'warning': return '#FFB75D'
      case 'error': return '#EA001E'
      default: return theme.secondaryText
    }
  }

  return (
    <div style={{
      backgroundColor: theme.cardBg,
      borderRadius: 8,
      padding: 24,
      border: `1px solid ${theme.border}`,
      transition: 'background-color 0.3s ease, border-color 0.3s ease'
    }}>
      <h2 style={{ marginTop: 0, color: theme.primaryText, marginBottom: 20 }}>
        📋 Bulk SSL Inspection
      </h2>
      <p style={{ color: theme.secondaryText, marginBottom: 24, lineHeight: 1.5 }}>
        Upload a file containing URLs for batch SSL certificate inspection. 
        Supports .txt (one URL per line), .csv (URLs in first column), and .json formats.
      </p>

      {/* File Upload Section */}
      <div style={{ marginBottom: 24 }}>
        <label style={{ 
          display: 'block', 
          fontWeight: 'bold', 
          marginBottom: 12, 
          color: theme.primaryText 
        }}>
          Upload URL File
        </label>
        <input
          type="file"
          accept=".txt,.csv,.json"
          onChange={handleFileUpload}
          style={{
            padding: 8,
            border: `1px solid ${theme.inputBorder}`,
            borderRadius: 4,
            backgroundColor: theme.inputBg,
            color: theme.primaryText,
            width: '100%',
            maxWidth: 400
          }}
        />
        <p style={{ fontSize: 12, color: theme.secondaryText, marginTop: 8 }}>
          Supported formats: .txt (one URL per line), .csv (URLs in first column), .json (array of URLs)
        </p>
      </div>

      {/* Uploaded URLs Preview */}
      {uploadedUrls.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ color: theme.primaryText, marginBottom: 12 }}>
            📄 Uploaded URLs ({uploadedUrls.length} total)
          </h3>
          <div style={{
            maxHeight: 200,
            overflowY: 'auto',
            border: `1px solid ${theme.border}`,
            borderRadius: 4,
            backgroundColor: theme.sectionBg,
            padding: 12
          }}>
            {uploadedUrls.slice(0, 10).map((urlObj, index) => (
              <div key={index} style={{ 
                padding: '4px 0', 
                color: theme.secondaryText,
                fontSize: 14
              }}>
                {index + 1}. {urlObj.hostname}
              </div>
            ))}
            {uploadedUrls.length > 10 && (
              <div style={{ 
                padding: '4px 0', 
                color: theme.secondaryText,
                fontSize: 14,
                fontStyle: 'italic'
              }}>
                ... and {uploadedUrls.length - 10} more
              </div>
            )}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div style={{ 
        display: 'flex', 
        gap: 12, 
        marginBottom: 24,
        flexWrap: 'wrap'
      }}>
        <button
          onClick={runBulkSSLInspection}
          disabled={isProcessing || uploadedUrls.length === 0}
          style={{
            padding: '12px 24px',
            borderRadius: 6,
            backgroundColor: isProcessing || uploadedUrls.length === 0 ? theme.disabledButton : theme.primaryButton,
            color: '#ffffff',
            border: 'none',
            cursor: isProcessing || uploadedUrls.length === 0 ? 'not-allowed' : 'pointer',
            fontSize: 16,
            fontWeight: 500,
            transition: 'background-color 0.3s ease'
          }}
          onMouseOver={(e) => {
            if (!isProcessing && uploadedUrls.length > 0) {
              e.target.style.backgroundColor = theme.primaryButtonHover
            }
          }}
          onMouseOut={(e) => {
            if (!isProcessing && uploadedUrls.length > 0) {
              e.target.style.backgroundColor = theme.primaryButton
            }
          }}
        >
          {isProcessing ? `🔄 Processing... (${progress.current}/${progress.total})` : `🚀 Run Bulk Inspection (${uploadedUrls.length} URLs)`}
        </button>

        {results.length > 0 && (
          <button
            onClick={downloadResults}
            style={{
              padding: '12px 24px',
              borderRadius: 6,
              backgroundColor: theme.secondaryButton,
              color: '#ffffff',
              border: 'none',
              cursor: 'pointer',
              fontSize: 16,
              fontWeight: 500,
              transition: 'background-color 0.3s ease'
            }}
          >
            📥 Download Results CSV
          </button>
        )}
      </div>

      {/* Progress Bar */}
      {isProcessing && (
        <div style={{ marginBottom: 24 }}>
          <div style={{
            width: '100%',
            height: 6,
            backgroundColor: theme.sectionBg,
            borderRadius: 3,
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${(progress.current / progress.total) * 100}%`,
              height: '100%',
              backgroundColor: theme.primaryButton,
              transition: 'width 0.3s ease'
            }} />
          </div>
          <p style={{ 
            fontSize: 14, 
            color: theme.secondaryText, 
            marginTop: 8,
            textAlign: 'center'
          }}>
            Processing {progress.current} of {progress.total} URLs...
          </p>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div style={{
          backgroundColor: '#FEF2F2',
          border: '1px solid #FCA5A5',
          borderRadius: 6,
          padding: 12,
          marginBottom: 24,
          color: '#DC2626'
        }}>
          ❌ {error}
        </div>
      )}

      {/* Results Summary */}
      {results.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ color: theme.primaryText, marginBottom: 16 }}>
            📊 Bulk SSL Inspection Results
          </h3>
          
          {/* Summary Cards */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', 
            gap: 12, 
            marginBottom: 20 
          }}>
            <div style={{
              backgroundColor: theme.sectionBg,
              padding: 16,
              borderRadius: 6,
              textAlign: 'center',
              border: `1px solid ${theme.border}`
            }}>
              <div style={{ fontSize: 24, marginBottom: 4 }}>📋</div>
              <div style={{ fontSize: 20, fontWeight: 'bold', color: theme.primaryText }}>
                {results.length}
              </div>
              <div style={{ fontSize: 12, color: theme.secondaryText }}>Total Checked</div>
            </div>
            
            <div style={{
              backgroundColor: theme.sectionBg,
              padding: 16,
              borderRadius: 6,
              textAlign: 'center',
              border: `1px solid ${theme.border}`
            }}>
              <div style={{ fontSize: 24, marginBottom: 4 }}>✅</div>
              <div style={{ fontSize: 20, fontWeight: 'bold', color: '#04844B' }}>
                {results.filter(r => r.status === 'valid').length}
              </div>
              <div style={{ fontSize: 12, color: theme.secondaryText }}>
                ({Math.round((results.filter(r => r.status === 'valid').length / results.length) * 100)}%)
              </div>
            </div>
            
            <div style={{
              backgroundColor: theme.sectionBg,
              padding: 16,
              borderRadius: 6,
              textAlign: 'center',
              border: `1px solid ${theme.border}`
            }}>
              <div style={{ fontSize: 24, marginBottom: 4 }}>⚠️</div>
              <div style={{ fontSize: 20, fontWeight: 'bold', color: '#FFB75D' }}>
                {results.filter(r => r.status === 'warning').length}
              </div>
              <div style={{ fontSize: 12, color: theme.secondaryText }}>
                ({Math.round((results.filter(r => r.status === 'warning').length / results.length) * 100)}%)
              </div>
            </div>
            
            <div style={{
              backgroundColor: theme.sectionBg,
              padding: 16,
              borderRadius: 6,
              textAlign: 'center',
              border: `1px solid ${theme.border}`
            }}>
              <div style={{ fontSize: 24, marginBottom: 4 }}>❌</div>
              <div style={{ fontSize: 20, fontWeight: 'bold', color: '#EA001E' }}>
                {results.filter(r => r.status === 'error').length}
              </div>
              <div style={{ fontSize: 12, color: theme.secondaryText }}>
                ({Math.round((results.filter(r => r.status === 'error').length / results.length) * 100)}%)
              </div>
            </div>
          </div>

          {/* Results Table */}
          <div style={{
            border: `1px solid ${theme.border}`,
            borderRadius: 6,
            overflow: 'hidden'
          }}>
            <div style={{
              backgroundColor: theme.sectionBg,
              padding: 12,
              borderBottom: `1px solid ${theme.border}`,
              fontWeight: 'bold',
              display: 'grid',
              gridTemplateColumns: '40px 1fr 80px 100px 120px 1fr',
              gap: 12,
              fontSize: 14,
              color: theme.primaryText
            }}>
              <div>Status</div>
              <div>Hostname</div>
              <div>Connected</div>
              <div>Response Time</div>
              <div>Days Until Expiry</div>
              <div>Message</div>
            </div>
            
            <div style={{ maxHeight: 400, overflowY: 'auto' }}>
              {results.map((result, index) => (
                <div
                  key={index}
                  style={{
                    padding: 12,
                    borderBottom: index < results.length - 1 ? `1px solid ${theme.border}` : 'none',
                    display: 'grid',
                    gridTemplateColumns: '40px 1fr 80px 100px 120px 1fr',
                    gap: 12,
                    fontSize: 14,
                    backgroundColor: index % 2 === 0 ? theme.cardBg : theme.sectionBg
                  }}
                >
                  <div style={{ 
                    textAlign: 'center', 
                    fontSize: 16,
                    color: getStatusColor(result.status)
                  }}>
                    {getStatusIcon(result.status)}
                  </div>
                  <div style={{ 
                    color: theme.primaryText,
                    fontFamily: 'monospace',
                    wordBreak: 'break-all'
                  }}>
                    {result.hostname}
                  </div>
                  <div style={{ 
                    color: result.connected ? '#04844B' : '#EA001E',
                    textAlign: 'center'
                  }}>
                    {result.connected ? '✅ Yes' : '❌ No'}
                  </div>
                  <div style={{ color: theme.secondaryText, textAlign: 'center' }}>
                    {result.responseTime ? `${result.responseTime}ms` : 'N/A'}
                  </div>
                  <div style={{ 
                    color: result.certificate?.daysUntilExpiry < 30 ? '#EA001E' : 
                           result.certificate?.daysUntilExpiry < 90 ? '#FFB75D' : '#04844B',
                    textAlign: 'center'
                  }}>
                    {result.certificate?.daysUntilExpiry || 'N/A'}
                  </div>
                  <div style={{ 
                    color: theme.secondaryText,
                    fontSize: 13,
                    wordBreak: 'break-word'
                  }}>
                    {result.message}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
