import { useState } from 'react'

export default function IntuneReport({ theme }) {
  const [accessToken, setAccessToken] = useState('')
  const [tenantId, setTenantId] = useState('')
  const [devices, setDevices] = useState([])
  const [detectedApps, setDetectedApps] = useState([])
  const [cloudPCs, setCloudPCs] = useState([])
  const [selectedAppId, setSelectedAppId] = useState('')
  const [selectedDeviceId, setSelectedDeviceId] = useState('')
  const [selectedUserId, setSelectedUserId] = useState('')
  const [selectedCloudPCId, setSelectedCloudPCId] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('devices')
  const [troubleshootResult, setTroubleshootResult] = useState(null)

  const graphApiCall = async (endpoint, token) => {
    try {
      const response = await fetch(`https://graph.microsoft.com/v1.0${endpoint}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      return data
    } catch (err) {
      throw new Error(`Graph API Error: ${err.message}`)
    }
  }

  const fetchManagedDevices = async () => {
    if (!accessToken.trim()) {
      setError('Please provide an access token')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const data = await graphApiCall('/deviceManagement/managedDevices', accessToken)
      setDevices(data.value || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchDetectedApps = async () => {
    if (!accessToken.trim()) {
      setError('Please provide an access token')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const data = await graphApiCall('/deviceManagement/detectedApps', accessToken)
      setDetectedApps(data.value || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchCloudPCs = async () => {
    if (!accessToken.trim()) {
      setError('Please provide an access token')
      return
    }

    setIsLoading(true)
    setError(null)
    setTroubleshootResult(null)

    try {
      const data = await graphApiCall('/deviceManagement/virtualEndpoint/cloudPCs', accessToken)
      setCloudPCs(data.value || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchCloudPCDetails = async () => {
    if (!accessToken.trim() || !selectedCloudPCId.trim()) {
      setError('Please provide an access token and Cloud PC ID')
      return
    }

    setIsLoading(true)
    setError(null)
    setTroubleshootResult(null)

    try {
      const data = await graphApiCall(`/deviceManagement/virtualEndpoint/cloudPCs/${selectedCloudPCId}`, accessToken)
      setCloudPCs([data])
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const troubleshootCloudPC = async () => {
    if (!accessToken.trim() || !selectedCloudPCId.trim()) {
      setError('Please provide an access token and Cloud PC ID')
      return
    }

    setIsLoading(true)
    setError(null)
    setTroubleshootResult(null)

    try {
      const response = await fetch(`https://graph.microsoft.com/v1.0/deviceManagement/virtualEndpoint/cloudPCs/${selectedCloudPCId}/troubleshoot`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const contentType = response.headers.get('content-type')
      let result
      if (contentType && contentType.includes('application/json')) {
        result = await response.json()
      } else {
        result = { 
          message: 'Troubleshoot request initiated successfully', 
          status: response.status,
          timestamp: new Date().toISOString(),
          cloudPCId: selectedCloudPCId
        }
      }
      
      setTroubleshootResult(result)
    } catch (err) {
      setError(`Troubleshoot Error: ${err.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchAppDevices = async () => {
    if (!accessToken.trim() || !selectedAppId.trim()) {
      setError('Please provide an access token and select an app')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const data = await graphApiCall(`/deviceManagement/detectedApps/${selectedAppId}/managedDevices`, accessToken)
      setDevices(data.value || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchUserDevices = async () => {
    if (!accessToken.trim() || !selectedAppId.trim() || !selectedDeviceId.trim() || !selectedUserId.trim()) {
      setError('Please provide access token, app ID, device ID, and user ID')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const data = await graphApiCall(
        `/deviceManagement/detectedApps/${selectedAppId}/managedDevices/${selectedDeviceId}/users/${selectedUserId}/managedDevices`,
        accessToken
      )
      setDevices(data.value || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const exportResults = () => {
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-')
    const filename = `intune-report-${activeTab}-${timestamp}.json`
    
    let data
    switch(activeTab) {
      case 'devices':
        data = devices
        break
      case 'apps':
        data = detectedApps
        break
      case 'cloudpc':
      case 'cloudpcDetails':
      case 'cloudpcTroubleshoot':
        data = cloudPCs
        break
      default:
        data = devices
    }
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  const copyToClipboard = async () => {
    let data
    switch(activeTab) {
      case 'devices':
        data = devices
        break
      case 'apps':
        data = detectedApps
        break
      case 'cloudpc':
      case 'cloudpcDetails':
      case 'cloudpcTroubleshoot':
        data = cloudPCs
        break
      default:
        data = devices
    }
    
    try {
      await navigator.clipboard.writeText(JSON.stringify(data, null, 2))
      alert('Results copied to clipboard!')
    } catch (err) {
      console.error('Failed to copy to clipboard:', err)
      alert('Failed to copy to clipboard')
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleString()
  }

  const getComplianceStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'compliant': return '#16a34a'
      case 'noncompliant': return '#dc2626'
      case 'conflict': return '#ca8a04'
      case 'error': return '#dc2626'
      case 'unknown': return '#6b7280'
      case 'notapplicable': return '#6b7280'
      default: return theme.secondaryText
    }
  }

  const getCloudPCStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'provisioned': return '#16a34a'
      case 'provisioning': return '#ca8a04'
      case 'deprovisioning': return '#f59e0b'
      case 'failed': return '#dc2626'
      case 'notprovisioned': return '#6b7280'
      case 'upgrading': return '#3b82f6'
      default: return theme.secondaryText
    }
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
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
          📱 Microsoft Intune Device Report
        </h2>
        <p style={{ 
          color: theme.secondaryText, 
          marginBottom: '32px', 
          fontSize: '16px' 
        }}>
          Access device information from Microsoft Graph API. Requires appropriate permissions and access token.
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

        {/* Authentication Section */}
        <div style={{ marginBottom: '32px' }}>
          <h3 style={{ 
            fontSize: '20px', 
            fontWeight: '600', 
            color: theme.primaryText, 
            marginBottom: '20px' 
          }}>
            🔐 Authentication
          </h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={{ 
                display: 'block', 
                fontWeight: '600', 
                color: theme.primaryText, 
                marginBottom: '8px' 
              }}>
                Access Token *
              </label>
              <input
                type="password"
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                placeholder="Enter Microsoft Graph API access token"
                style={{ 
                  width: '100%', 
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
            </div>
            <div>
              <label style={{ 
                display: 'block', 
                fontWeight: '600', 
                color: theme.primaryText, 
                marginBottom: '8px' 
              }}>
                Tenant ID (Optional)
              </label>
              <input
                type="text"
                value={tenantId}
                onChange={(e) => setTenantId(e.target.value)}
                placeholder="Enter Azure AD Tenant ID"
                style={{ 
                  width: '100%', 
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
            </div>
          </div>

          <div style={{ fontSize: '14px', color: theme.secondaryText, marginBottom: '16px' }}>
            💡 <strong>Required Permissions:</strong> DeviceManagementManagedDevices.Read.All, DeviceManagementApps.Read.All, CloudPC.Read.All
          </div>
        </div>

        {/* Tab Navigation */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
            {[
              { id: 'devices', label: '📱 Managed Devices', action: fetchManagedDevices },
              { id: 'apps', label: '📦 Detected Apps', action: fetchDetectedApps },
              { id: 'appDevices', label: '🔗 App Devices', action: fetchAppDevices },
              { id: 'userDevices', label: '👤 User Devices', action: fetchUserDevices },
              { id: 'cloudpc', label: '☁️ CloudPC', action: fetchCloudPCs },
              { id: 'cloudpcDetails', label: '🔍 CloudPC Details', action: fetchCloudPCDetails },
              { id: 'cloudpcTroubleshoot', label: '🔧 CloudPC Troubleshoot', action: troubleshootCloudPC }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id)
                  setError(null)
                  setTroubleshootResult(null)
                }}
                style={{
                  padding: '10px 16px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: activeTab === tab.id ? theme.primaryButton : theme.sectionBg,
                  color: activeTab === tab.id ? '#ffffff' : theme.primaryText,
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  marginBottom: '8px'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab-specific inputs */}
          {(activeTab === 'appDevices' || activeTab === 'userDevices') && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '16px' }}>
              <input
                type="text"
                value={selectedAppId}
                onChange={(e) => setSelectedAppId(e.target.value)}
                placeholder="App ID"
                style={{ 
                  padding: '10px 12px', 
                  border: `1px solid ${theme.inputBorder}`, 
                  borderRadius: '6px',
                  backgroundColor: theme.inputBg,
                  color: theme.primaryText
                }}
              />
              {activeTab === 'userDevices' && (
                <>
                  <input
                    type="text"
                    value={selectedDeviceId}
                    onChange={(e) => setSelectedDeviceId(e.target.value)}
                    placeholder="Device ID"
                    style={{ 
                      padding: '10px 12px', 
                      border: `1px solid ${theme.inputBorder}`, 
                      borderRadius: '6px',
                      backgroundColor: theme.inputBg,
                      color: theme.primaryText
                    }}
                  />
                  <input
                    type="text"
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    placeholder="User ID"
                    style={{ 
                      padding: '10px 12px', 
                      border: `1px solid ${theme.inputBorder}`, 
                      borderRadius: '6px',
                      backgroundColor: theme.inputBg,
                      color: theme.primaryText
                    }}
                  />
                </>
              )}
            </div>
          )}

          {/* CloudPC specific inputs */}
          {(activeTab === 'cloudpcDetails' || activeTab === 'cloudpcTroubleshoot') && (
            <div style={{ marginBottom: '16px' }}>
              <input
                type="text"
                value={selectedCloudPCId}
                onChange={(e) => setSelectedCloudPCId(e.target.value)}
                placeholder="Cloud PC ID"
                style={{ 
                  padding: '10px 12px', 
                  border: `1px solid ${theme.inputBorder}`, 
                  borderRadius: '6px',
                  backgroundColor: theme.inputBg,
                  color: theme.primaryText,
                  width: '300px'
                }}
              />
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button
              onClick={() => {
                switch(activeTab) {
                  case 'devices': fetchManagedDevices(); break;
                  case 'apps': fetchDetectedApps(); break;
                  case 'appDevices': fetchAppDevices(); break;
                  case 'userDevices': fetchUserDevices(); break;
                  case 'cloudpc': fetchCloudPCs(); break;
                  case 'cloudpcDetails': fetchCloudPCDetails(); break;
                  case 'cloudpcTroubleshoot': troubleshootCloudPC(); break;
                }
              }}
              disabled={isLoading}
              style={{
                padding: '12px 24px',
                borderRadius: '6px',
                backgroundColor: isLoading ? theme.disabledButton : theme.primaryButton,
                color: '#ffffff',
                border: 'none',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                fontSize: '16px',
                fontWeight: '500'
              }}
              onMouseOver={(e) => {
                if (!isLoading) e.target.style.backgroundColor = theme.primaryButtonHover
              }}
              onMouseOut={(e) => {
                if (!isLoading) e.target.style.backgroundColor = theme.primaryButton
              }}
            >
              {isLoading ? '🔄 Loading...' : '🚀 Fetch Data'}
            </button>

            {(devices.length > 0 || detectedApps.length > 0 || cloudPCs.length > 0) && (
              <>
                <button
                  onClick={exportResults}
                  style={{
                    padding: '12px 20px',
                    backgroundColor: theme.secondaryButton,
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: '600',
                    fontSize: '14px'
                  }}
                  onMouseOver={(e) => e.target.style.backgroundColor = '#e55a2b'}
                  onMouseOut={(e) => e.target.style.backgroundColor = theme.secondaryButton}
                >
                  📥 Export JSON
                </button>
                <button
                  onClick={copyToClipboard}
                  style={{
                    padding: '12px 20px',
                    backgroundColor: theme.primaryButton,
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: '600',
                    fontSize: '14px'
                  }}
                  onMouseOver={(e) => e.target.style.backgroundColor = theme.primaryButtonHover}
                  onMouseOut={(e) => e.target.style.backgroundColor = theme.primaryButton}
                >
                  📋 Copy to Clipboard
                </button>
              </>
            )}
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
              Fetching data from Microsoft Graph API...
            </span>
          </div>
        )}

        {/* Troubleshoot Result Display */}
        {troubleshootResult && (
          <div style={{ marginTop: '24px' }}>
            <h3 style={{ 
              fontSize: '20px', 
              fontWeight: '600', 
              color: theme.primaryText, 
              marginBottom: '20px' 
            }}>
              🔧 Troubleshoot Result
            </h3>
            <div style={{
              background: theme.sectionBg,
              border: `2px solid ${theme.border}`,
              borderRadius: '12px',
              padding: '20px'
            }}>
              <pre style={{
                color: theme.primaryText,
                fontSize: '14px',
                overflow: 'auto',
                whiteSpace: 'pre-wrap'
              }}>
                {JSON.stringify(troubleshootResult, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {/* Results Display - CloudPC */}
        {(activeTab.startsWith('cloudpc')) && cloudPCs.length > 0 && (
          <div style={{ marginTop: '24px' }}>
            <h3 style={{ 
              fontSize: '20px', 
              fontWeight: '600', 
              color: theme.primaryText, 
              marginBottom: '20px' 
            }}>
              📊 Cloud PCs ({cloudPCs.length})
            </h3>
            
            <div style={{ overflowX: 'auto' }}>
              <table style={{ 
                width: '100%', 
                borderCollapse: 'collapse',
                backgroundColor: theme.cardBg,
                borderRadius: '8px',
                overflow: 'hidden',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}>
                <thead>
                  <tr style={{ backgroundColor: theme.sectionBg }}>
                    <th style={{ padding: '12px', textAlign: 'left', color: theme.primaryText, fontWeight: '600' }}>Display Name</th>
                    <th style={{ padding: '12px', textAlign: 'left', color: theme.primaryText, fontWeight: '600' }}>Status</th>
                    <th style={{ padding: '12px', textAlign: 'left', color: theme.primaryText, fontWeight: '600' }}>User</th>
                    <th style={{ padding: '12px', textAlign: 'left', color: theme.primaryText, fontWeight: '600' }}>PC Name</th>
                    <th style={{ padding: '12px', textAlign: 'left', color: theme.primaryText, fontWeight: '600' }}>Image Type</th>
                    <th style={{ padding: '12px', textAlign: 'left', color: theme.primaryText, fontWeight: '600' }}>Last Modified</th>
                    <th style={{ padding: '12px', textAlign: 'left', color: theme.primaryText, fontWeight: '600' }}>ID</th>
                  </tr>
                </thead>
                <tbody>
                  {cloudPCs.map((cloudPC, index) => (
                    <tr key={cloudPC.id || index} style={{ borderBottom: `1px solid ${theme.border}` }}>
                      <td style={{ padding: '12px', color: theme.primaryText }}>{cloudPC.displayName || 'N/A'}</td>
                      <td style={{ padding: '12px' }}>
                        <span style={{ 
                          color: getCloudPCStatusColor(cloudPC.status),
                          fontWeight: '600'
                        }}>
                          {cloudPC.status || 'Unknown'}
                        </span>
                      </td>
                      <td style={{ padding: '12px', color: theme.secondaryText }}>{cloudPC.userPrincipalName || 'N/A'}</td>
                      <td style={{ padding: '12px', color: theme.secondaryText }}>{cloudPC.managedDeviceName || 'N/A'}</td>
                      <td style={{ padding: '12px', color: theme.secondaryText }}>{cloudPC.imageDisplayName || 'N/A'}</td>
                      <td style={{ padding: '12px', color: theme.secondaryText }}>{formatDate(cloudPC.lastModifiedDateTime)}</td>
                      <td style={{ padding: '12px', color: theme.secondaryText, fontFamily: 'monospace', fontSize: '10px' }}>
                        {cloudPC.id || 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Results Display - Managed Devices */}
        {activeTab === 'devices' && devices.length > 0 && (
          <div style={{ marginTop: '24px' }}>
            <h3 style={{ 
              fontSize: '20px', 
              fontWeight: '600', 
              color: theme.primaryText, 
              marginBottom: '20px' 
            }}>
              📊 Managed Devices ({devices.length})
            </h3>
            
            <div style={{ overflowX: 'auto' }}>
              <table style={{ 
                width: '100%', 
                borderCollapse: 'collapse',
                backgroundColor: theme.cardBg,
                borderRadius: '8px',
                overflow: 'hidden',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}>
                <thead>
                  <tr style={{ backgroundColor: theme.sectionBg }}>
                    <th style={{ padding: '12px', textAlign: 'left', color: theme.primaryText, fontWeight: '600' }}>Device Name</th>
                    <th style={{ padding: '12px', textAlign: 'left', color: theme.primaryText, fontWeight: '600' }}>OS</th>
                    <th style={{ padding: '12px', textAlign: 'left', color: theme.primaryText, fontWeight: '600' }}>Compliance</th>
                    <th style={{ padding: '12px', textAlign: 'left', color: theme.primaryText, fontWeight: '600' }}>User</th>
                    <th style={{ padding: '12px', textAlign: 'left', color: theme.primaryText, fontWeight: '600' }}>Last Sync</th>
                    <th style={{ padding: '12px', textAlign: 'left', color: theme.primaryText, fontWeight: '600' }}>Serial Number</th>
                  </tr>
                </thead>
                <tbody>
                  {devices.map((device, index) => (
                    <tr key={device.id || index} style={{ borderBottom: `1px solid ${theme.border}` }}>
                      <td style={{ padding: '12px', color: theme.primaryText }}>{device.deviceName || 'N/A'}</td>
                      <td style={{ padding: '12px', color: theme.secondaryText }}>
                        {device.operatingSystem} {device.osVersion}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span style={{ 
                          color: getComplianceStatusColor(device.complianceState),
                          fontWeight: '600'
                        }}>
                          {device.complianceState || 'Unknown'}
                        </span>
                      </td>
                      <td style={{ padding: '12px', color: theme.secondaryText }}>{device.userDisplayName || 'N/A'}</td>
                      <td style={{ padding: '12px', color: theme.secondaryText }}>{formatDate(device.lastSyncDateTime)}</td>
                      <td style={{ padding: '12px', color: theme.secondaryText, fontFamily: 'monospace', fontSize: '12px' }}>
                        {device.serialNumber || 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Results Display - Detected Apps */}
        {activeTab === 'apps' && detectedApps.length > 0 && (
          <div style={{ marginTop: '24px' }}>
            <h3 style={{ 
              fontSize: '20px', 
              fontWeight: '600', 
              color: theme.primaryText, 
              marginBottom: '20px' 
            }}>
              📊 Detected Apps ({detectedApps.length})
            </h3>
            
            <div style={{ overflowX: 'auto' }}>
              <table style={{ 
                width: '100%', 
                borderCollapse: 'collapse',
                backgroundColor: theme.cardBg,
                borderRadius: '8px',
                overflow: 'hidden',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}>
                <thead>
                  <tr style={{ backgroundColor: theme.sectionBg }}>
                    <th style={{ padding: '12px', textAlign: 'left', color: theme.primaryText, fontWeight: '600' }}>App Name</th>
                    <th style={{ padding: '12px', textAlign: 'left', color: theme.primaryText, fontWeight: '600' }}>Version</th>
                    <th style={{ padding: '12px', textAlign: 'left', color: theme.primaryText, fontWeight: '600' }}>Publisher</th>
                    <th style={{ padding: '12px', textAlign: 'left', color: theme.primaryText, fontWeight: '600' }}>Platform</th>
                    <th style={{ padding: '12px', textAlign: 'left', color: theme.primaryText, fontWeight: '600' }}>Device Count</th>
                    <th style={{ padding: '12px', textAlign: 'left', color: theme.primaryText, fontWeight: '600' }}>App ID</th>
                  </tr>
                </thead>
                <tbody>
                  {detectedApps.map((app, index) => (
                    <tr key={app.id || index} style={{ borderBottom: `1px solid ${theme.border}` }}>
                      <td style={{ padding: '12px', color: theme.primaryText }}>{app.displayName || 'N/A'}</td>
                      <td style={{ padding: '12px', color: theme.secondaryText }}>{app.version || 'N/A'}</td>
                      <td style={{ padding: '12px', color: theme.secondaryText }}>{app.publisher || 'N/A'}</td>
                      <td style={{ padding: '12px', color: theme.secondaryText }}>{app.platform || 'N/A'}</td>
                      <td style={{ padding: '12px', color: theme.secondaryText }}>{app.deviceCount || 0}</td>
                      <td style={{ padding: '12px', color: theme.secondaryText, fontFamily: 'monospace', fontSize: '10px' }}>
                        {app.id || 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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