import { useState, useMemo } from 'react'

export default function IntuneReport({ theme }) {
  const [accessToken, setAccessToken] = useState('')
  const [tenantId, setTenantId] = useState('')
  const [devices, setDevices] = useState([])
  const [detectedApps, setDetectedApps] = useState([])
  const [appDevices, setAppDevices] = useState([])
  const [userDevices, setUserDevices] = useState([])
  const [configurations, setConfigurations] = useState([])
  const [configurationPolicies, setConfigurationPolicies] = useState([])
  const [resourceAccessProfiles, setResourceAccessProfiles] = useState([])
  const [mobileAppConfigurations, setMobileAppConfigurations] = useState([])
  const [groupPolicyConfigurations, setGroupPolicyConfigurations] = useState([])
  const [selectedPlatformFilter, setSelectedPlatformFilter] = useState('all')
  const [cloudPCs, setCloudPCs] = useState([])
  const [selectedAppId, setSelectedAppId] = useState('')
  const [selectedDeviceId, setSelectedDeviceId] = useState('')
  const [selectedUserId, setSelectedUserId] = useState('')
  const [selectedCloudPCId, setSelectedCloudPCId] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('devices')
  const [troubleshootResult, setTroubleshootResult] = useState(null)

  const graphApiCall = async (endpoint, token, useBeta = false) => {
    try {
      const baseUrl = useBeta ? 'https://graph.microsoft.com/beta' : 'https://graph.microsoft.com/v1.0'
      const fullUrl = `${baseUrl}${endpoint}`
      
      console.log(`Making Graph API call to: ${fullUrl}`)
      
      const response = await fetch(fullUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        let errorDetails = `HTTP ${response.status}: ${response.statusText}`
        errorDetails += `\nURL: ${fullUrl}`
        
        // Try to get detailed error message from response body
        try {
          const errorBody = await response.json()
          if (errorBody.error) {
            errorDetails += `\nError Code: ${errorBody.error.code || 'Unknown'}`
            errorDetails += `\nMessage: ${errorBody.error.message || 'No message provided'}`
            if (errorBody.error.innerError) {
              errorDetails += `\nInner Error: ${errorBody.error.innerError.message || 'No inner error details'}`
            }
          }
        } catch (parseError) {
          errorDetails += '\nUnable to parse error response body'
        }
        
        throw new Error(errorDetails)
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

  const fetchConfigurations = async () => {
    try {
      if (!accessToken.trim()) {
        setError('Please provide an access token')
        return
      }

      setIsLoading(true)
      setError(null)

      console.log('🔧 Fetching all configuration types...')
      
      const fetchPromises = []
      
      // Configuration Policies (Modern policies for all platforms) - Use Beta API
      fetchPromises.push(
        graphApiCall('/deviceManagement/configurationPolicies', accessToken, true)
          .then(data => {
            console.log('✅ Configuration Policies Response:', data)
            const policies = data.value || []
            console.log('📋 Configuration Policies Array:', policies)
            setConfigurationPolicies(policies)
          })
          .catch(err => {
            console.warn('❌ Configuration Policies (beta) failed:', err.message)
            setConfigurationPolicies([])
          })
      )

      // ALL Device Configurations (includes everything - don't filter anything out!)
      fetchPromises.push(
        graphApiCall('/deviceManagement/deviceConfigurations?$select=id,displayName,lastModifiedDateTime,createdDateTime,devicePlatform,@odata.type&$orderBy=displayName asc', accessToken)
          .then(data => {
            console.log('✅ ALL Device Configurations Response:', data)
            const allConfigs = data.value || []
            console.log('� ALL Device Configurations Array:', allConfigs)
            
            // Set ALL configurations as "Device Configurations" - don't filter anything
            setConfigurations(allConfigs)
            
            // Also set a subset as "Resource Access Profiles" for the separate section
            const resourceTypes = allConfigs.filter(config => {
              const type = (config['@odata.type'] || '').toLowerCase()
              return type.includes('certificate') || type.includes('wifi') || type.includes('vpn') || type.includes('email')
            })
            console.log('🔐 Resource Access Profiles (subset):', resourceTypes)
            setResourceAccessProfiles(resourceTypes)
          })
          .catch(err => {
            console.warn('❌ Device Configurations failed:', err.message)
            setConfigurations([])
            setResourceAccessProfiles([])
          })
      )

      // Mobile App Configurations (Android app configs)
      fetchPromises.push(
        graphApiCall('/deviceAppManagement/mobileAppConfigurations', accessToken)
          .then(data => {
            console.log('✅ Mobile App Configurations Response:', data)
            const configs = data.value || []
            console.log('📱 Mobile App Configurations Array:', configs)
            setMobileAppConfigurations(configs)
          })
          .catch(err => {
            console.warn('❌ Mobile App Configurations failed:', err.message)
            setMobileAppConfigurations([])
          })
      )

      // Group Policy Configurations (Windows ADMX policies) - Use Beta API
      fetchPromises.push(
        graphApiCall('/deviceManagement/groupPolicyConfigurations?$top=1500', accessToken, true)
          .then(data => {
            console.log('✅ Group Policy Configurations Response:', data)
            const groupPolicies = data.value || []
            console.log('🏛️ Group Policy Configurations Array:', groupPolicies)
            setGroupPolicyConfigurations(groupPolicies)
          })
          .catch(err => {
            console.warn('❌ Group Policy Configurations failed:', err.message)
            setGroupPolicyConfigurations([])
          })
      )

      // Device Compliance Policies (these might be the missing ones!)
      fetchPromises.push(
        graphApiCall('/deviceManagement/deviceCompliancePolicies', accessToken)
          .then(data => {
            console.log('✅ Device Compliance Policies Response:', data)
            const compliancePolicies = data.value || []
            console.log('🛡️ Device Compliance Policies Array:', compliancePolicies)
            // Add these to configurations as well since they were likely included before
            setConfigurations(prev => [...(prev || []), ...compliancePolicies])
          })
          .catch(err => {
            console.warn('❌ Device Compliance Policies failed:', err.message)
          })
      )

      // Wait for all requests to complete
      await Promise.allSettled(fetchPromises)

      // Additional endpoints for legacy configurations
      const additionalPromises = []
      
      // Device Enrollment Configurations (Legacy configurations)
      additionalPromises.push(
        graphApiCall('/deviceManagement/deviceEnrollmentConfigurations', accessToken)
          .then(data => {
            console.log('✅ Device Enrollment Configurations Response:', data)
            const enrollmentConfigs = data.value || []
            console.log('📝 Device Enrollment Configurations Array:', enrollmentConfigs)
            setConfigurations(prev => [...(prev || []), ...enrollmentConfigs])
          })
          .catch(err => {
            console.warn('❌ Device Enrollment Configurations failed:', err.message)
          })
      )

      // Windows Autopilot Deployment Profiles (Legacy configurations)
      additionalPromises.push(
        graphApiCall('/deviceManagement/windowsAutopilotDeploymentProfiles', accessToken)
          .then(data => {
            console.log('✅ Windows Autopilot Deployment Profiles Response:', data)
            const autopilotProfiles = data.value || []
            console.log('✈️ Windows Autopilot Deployment Profiles Array:', autopilotProfiles)
            setConfigurations(prev => [...(prev || []), ...autopilotProfiles])
          })
          .catch(err => {
            console.warn('❌ Windows Autopilot Deployment Profiles failed:', err.message)
          })
      )

      // Device Management Scripts (PowerShell scripts - Legacy configurations)
      additionalPromises.push(
        graphApiCall('/deviceManagement/deviceManagementScripts', accessToken)
          .then(data => {
            console.log('✅ Device Management Scripts Response:', data)
            const scripts = data.value || []
            console.log('📜 Device Management Scripts Array:', scripts)
            setConfigurations(prev => [...(prev || []), ...scripts])
          })
          .catch(err => {
            console.warn('❌ Device Management Scripts failed:', err.message)
          })
      )

      // Wait for additional requests to complete
      await Promise.allSettled(additionalPromises)
      
      console.log('🎉 Configuration fetch completed')
    } catch (err) {
      console.error('Fetch configurations error:', err)
      setError(`Configuration fetch failed: ${err.message}`)
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
      // Try the standard CloudPC endpoint first
      const data = await graphApiCall('/deviceManagement/virtualEndpoint/cloudPCs', accessToken, true)
      setCloudPCs(data.value || [])
    } catch (err) {
      // If that fails, try the alternative endpoint with count by status
      try {
        const countData = await graphApiCall('/deviceManagement/virtualEndpoint/cloudPCs/retrieveCloudPcCountByStatus', accessToken, true)
        
        // Also try to get the actual CloudPC list
        const listData = await graphApiCall('/deviceManagement/virtualEndpoint/cloudPCs?$filter=servicePlanType eq \'enterprise\'', accessToken, true)
        
        setCloudPCs(listData.value || [])
        
        // Set additional info about the count data if available
        if (countData && !listData.value?.length) {
          setTroubleshootResult({
            message: 'CloudPC count retrieved successfully',
            data: countData,
            timestamp: new Date().toISOString()
          })
        }
      } catch (secondErr) {
        setError(`CloudPC API Error: ${secondErr.message}. Note: CloudPC requires beta API access and may need additional permissions.`)
      }
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
      const data = await graphApiCall(`/deviceManagement/virtualEndpoint/cloudPCs/${selectedCloudPCId}`, accessToken, true)
      setCloudPCs([data])
    } catch (err) {
      setError(`CloudPC Details Error: ${err.message}. Note: CloudPC requires beta API access.`)
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
      const response = await fetch(`https://graph.microsoft.com/beta/deviceManagement/virtualEndpoint/cloudPCs/${selectedCloudPCId}/troubleshoot`, {
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
      setError(`Troubleshoot Error: ${err.message}. Note: CloudPC troubleshoot requires beta API access.`)
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
      setAppDevices(data.value || [])
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
      setUserDevices(data.value || [])
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
      case 'appDevices':
        data = appDevices
        break
      case 'userDevices':
        data = userDevices
        break
      case 'configurations':
        data = {
          configurationPolicies,
          resourceAccessProfiles,
          mobileAppConfigurations,
          groupPolicyConfigurations,
          deviceConfigurations: configurations
        }
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
      case 'appDevices':
        data = appDevices
        break
      case 'userDevices':
        data = userDevices
        break
      case 'configurations':
        data = {
          configurationPolicies,
          resourceAccessProfiles,
          mobileAppConfigurations,
          groupPolicyConfigurations,
          deviceConfigurations: configurations
        }
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

  const filterByPlatform = (data, platformField = 'platforms') => {
    if (!data || !Array.isArray(data)) return []
    if (!selectedPlatformFilter || selectedPlatformFilter === 'all') return data
    
    try {
      return data.filter(item => {
        if (!item) return false
        
        const platforms = item[platformField]
        if (!platforms) return false
        
        if (Array.isArray(platforms)) {
          return platforms.some(platform => {
            if (!platform || typeof platform !== 'string') return false
            const platformLower = platform.toLowerCase()
            const filterLower = selectedPlatformFilter.toLowerCase()
            
            // Handle exact matches and common variations
            return platformLower === filterLower || 
                   platformLower.includes(filterLower) ||
                   (filterLower === 'windows10' && (platformLower.includes('windows') || platformLower.includes('win'))) ||
                   (filterLower === 'windows11' && (platformLower.includes('windows') || platformLower.includes('win'))) ||
                   (filterLower === 'android' && platformLower.includes('android')) ||
                   (filterLower === 'ios' && platformLower === 'ios')
          })
        }
        
        if (typeof platforms === 'string') {
          const platformLower = platforms.toLowerCase()
          const filterLower = selectedPlatformFilter.toLowerCase()
          
          return platformLower === filterLower || 
                 platformLower.includes(filterLower) ||
                 (filterLower === 'windows10' && (platformLower.includes('windows') || platformLower.includes('win'))) ||
                 (filterLower === 'windows11' && (platformLower.includes('windows') || platformLower.includes('win')))
        }
        
        return false
      })
    } catch (err) {
      console.error('Error filtering by platform:', err)
      return data || []
    }
  }

  const platformOptions = useMemo(() => {
    try {
      const allPlatforms = new Set()
      
      // Add default common platforms first
      const commonPlatforms = ['windows10', 'windows11', 'macOS', 'iOS', 'android', 'androidEnterprise', 'linux']
      commonPlatforms.forEach(platform => allPlatforms.add(platform))
      
      // Collect platforms from configuration policies if available
      if (Array.isArray(configurationPolicies) && configurationPolicies.length > 0) {
        configurationPolicies.forEach(policy => {
          if (policy && policy.platforms && Array.isArray(policy.platforms)) {
            policy.platforms.forEach(platform => {
              if (platform && typeof platform === 'string' && platform.trim()) {
                allPlatforms.add(platform.trim())
              }
            })
          }
        })
      }
      
      // Convert to sorted array with 'all' first
      const sortedPlatforms = Array.from(allPlatforms).sort()
      return ['all', ...sortedPlatforms]
    } catch (err) {
      console.error('Error getting platform options:', err)
      // Return safe fallback
      return ['all', 'windows10', 'windows11', 'macOS', 'iOS', 'android', 'androidEnterprise', 'linux']
    }
  }, [configurationPolicies])

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {error && (
        <div style={{
          backgroundColor: '#fee2e2',
          border: '1px solid #fecaca',
          color: '#991b1b',
          padding: '12px',
          borderRadius: '8px',
          marginBottom: '16px',
          whiteSpace: 'pre-wrap'
        }}>
          <strong>Error:</strong> {error}
        </div>
      )}
      
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
            💡 <strong>Required Permissions:</strong> DeviceManagementManagedDevices.Read.All, DeviceManagementApps.Read.All, CloudPC.Read.All<br/>
            ⚠️ <strong>CloudPC Note:</strong> CloudPC features use the Microsoft Graph beta API and may require additional permissions or tenant configuration.
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
              { id: 'configurations', label: '⚙️ Configurations', action: fetchConfigurations },
              { id: 'cloudpc', label: '☁️ CloudPC (Beta)', action: fetchCloudPCs },
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

          {/* Configurations specific inputs */}
          {activeTab === 'configurations' && (
            <div style={{ marginBottom: '16px' }}>
              <select
                value={selectedPlatformFilter}
                onChange={(e) => setSelectedPlatformFilter(e.target.value)}
                style={{ 
                  padding: '10px 12px', 
                  border: `1px solid ${theme.inputBorder}`, 
                  borderRadius: '6px',
                  backgroundColor: theme.inputBg,
                  color: theme.primaryText,
                  width: '200px'
                }}
              >
                <option value="all">All Platforms</option>
                {platformOptions.slice(1).map(platform => (
                  <option key={platform} value={platform}>
                    {platform.charAt(0).toUpperCase() + platform.slice(1)}
                  </option>
                ))}
              </select>
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
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                
                try {
                  switch(activeTab) {
                    case 'devices': fetchManagedDevices(); break;
                    case 'apps': fetchDetectedApps(); break;
                    case 'appDevices': fetchAppDevices(); break;
                    case 'userDevices': fetchUserDevices(); break;
                    case 'configurations': fetchConfigurations(); break;
                    case 'cloudpc': fetchCloudPCs(); break;
                    case 'cloudpcDetails': fetchCloudPCDetails(); break;
                    case 'cloudpcTroubleshoot': troubleshootCloudPC(); break;
                  }
                } catch (err) {
                  console.error('Button click error:', err)
                  setError(`Button action failed: ${err.message}`)
                }
              }}
              disabled={isLoading}
              type="button"
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

            {(devices.length > 0 || detectedApps.length > 0 || appDevices.length > 0 || userDevices.length > 0 || configurations.length > 0 || configurationPolicies.length > 0 || resourceAccessProfiles.length > 0 || mobileAppConfigurations.length > 0 || groupPolicyConfigurations.length > 0 || cloudPCs.length > 0) && (
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

        {/* Results Display - App Devices */}
        {activeTab === 'appDevices' && appDevices.length > 0 && (
          <div style={{ marginTop: '24px' }}>
            <h3 style={{ 
              fontSize: '20px', 
              fontWeight: '600', 
              color: theme.primaryText, 
              marginBottom: '16px' 
            }}>
              📊 App Devices ({appDevices.length})
            </h3>
            <div style={{ 
              border: `1px solid ${theme.border}`, 
              borderRadius: '8px', 
              overflow: 'hidden',
              backgroundColor: theme.cardBg
            }}>
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
                    <th style={{ padding: '12px', textAlign: 'left', color: theme.primaryText, fontWeight: '600' }}>Platform</th>
                    <th style={{ padding: '12px', textAlign: 'left', color: theme.primaryText, fontWeight: '600' }}>Compliance</th>
                    <th style={{ padding: '12px', textAlign: 'left', color: theme.primaryText, fontWeight: '600' }}>Last Sync</th>
                    <th style={{ padding: '12px', textAlign: 'left', color: theme.primaryText, fontWeight: '600' }}>Device ID</th>
                  </tr>
                </thead>
                <tbody>
                  {appDevices.map((device, index) => (
                    <tr key={device.id || index} style={{ borderBottom: `1px solid ${theme.border}` }}>
                      <td style={{ padding: '12px', color: theme.primaryText }}>{device.deviceName || 'N/A'}</td>
                      <td style={{ padding: '12px', color: theme.secondaryText }}>{device.operatingSystem || 'N/A'}</td>
                      <td style={{ padding: '12px' }}>
                        <span style={{ 
                          color: getComplianceStatusColor(device.complianceState),
                          fontWeight: '500'
                        }}>
                          {device.complianceState || 'Unknown'}
                        </span>
                      </td>
                      <td style={{ padding: '12px', color: theme.secondaryText }}>{formatDate(device.lastSyncDateTime)}</td>
                      <td style={{ padding: '12px', color: theme.secondaryText, fontFamily: 'monospace', fontSize: '10px' }}>
                        {device.id || 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Results Display - User Devices */}
        {activeTab === 'userDevices' && userDevices.length > 0 && (
          <div style={{ marginTop: '24px' }}>
            <h3 style={{ 
              fontSize: '20px', 
              fontWeight: '600', 
              color: theme.primaryText, 
              marginBottom: '16px' 
            }}>
              📊 User Devices ({userDevices.length})
            </h3>
            <div style={{ 
              border: `1px solid ${theme.border}`, 
              borderRadius: '8px', 
              overflow: 'hidden',
              backgroundColor: theme.cardBg
            }}>
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
                    <th style={{ padding: '12px', textAlign: 'left', color: theme.primaryText, fontWeight: '600' }}>User</th>
                    <th style={{ padding: '12px', textAlign: 'left', color: theme.primaryText, fontWeight: '600' }}>Platform</th>
                    <th style={{ padding: '12px', textAlign: 'left', color: theme.primaryText, fontWeight: '600' }}>Compliance</th>
                    <th style={{ padding: '12px', textAlign: 'left', color: theme.primaryText, fontWeight: '600' }}>Last Sync</th>
                    <th style={{ padding: '12px', textAlign: 'left', color: theme.primaryText, fontWeight: '600' }}>Device ID</th>
                  </tr>
                </thead>
                <tbody>
                  {userDevices.map((device, index) => (
                    <tr key={device.id || index} style={{ borderBottom: `1px solid ${theme.border}` }}>
                      <td style={{ padding: '12px', color: theme.primaryText }}>{device.deviceName || 'N/A'}</td>
                      <td style={{ padding: '12px', color: theme.secondaryText }}>{device.userDisplayName || device.emailAddress || 'N/A'}</td>
                      <td style={{ padding: '12px', color: theme.secondaryText }}>{device.operatingSystem || 'N/A'}</td>
                      <td style={{ padding: '12px' }}>
                        <span style={{ 
                          color: getComplianceStatusColor(device.complianceState),
                          fontWeight: '500'
                        }}>
                          {device.complianceState || 'Unknown'}
                        </span>
                      </td>
                      <td style={{ padding: '12px', color: theme.secondaryText }}>{formatDate(device.lastSyncDateTime)}</td>
                      <td style={{ padding: '12px', color: theme.secondaryText, fontFamily: 'monospace', fontSize: '10px' }}>
                        {device.id || 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Results Display - All Configuration Types */}
        {activeTab === 'configurations' && (configurationPolicies.length > 0 || resourceAccessProfiles.length > 0 || mobileAppConfigurations.length > 0 || groupPolicyConfigurations.length > 0 || configurations.length > 0) && (
          <div style={{ marginTop: '24px' }}>
            <h3 style={{ 
              fontSize: '24px', 
              fontWeight: '600', 
              color: theme.primaryText, 
              marginBottom: '24px' 
            }}>
              ⚙️ All Intune Configuration Types
            </h3>

            {/* Configuration Policies (Modern) */}
            {configurationPolicies && Array.isArray(configurationPolicies) && configurationPolicies.length > 0 && (
              <div style={{ marginBottom: '32px' }}>
                <h4 style={{ 
                  fontSize: '18px', 
                  fontWeight: '600', 
                  color: theme.primaryText, 
                  marginBottom: '16px' 
                }}>
                  🔧 Configuration Policies - Modern ({(() => {
                    try {
                      const filtered = filterByPlatform(configurationPolicies)
                      return `${filtered.length} of ${configurationPolicies.length}`
                    } catch (err) {
                      return configurationPolicies.length
                    }
                  })()})
                </h4>
                <div style={{ 
                  border: `1px solid ${theme.border}`, 
                  borderRadius: '8px', 
                  overflow: 'hidden',
                  backgroundColor: theme.cardBg
                }}>
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
                        <th style={{ padding: '12px', textAlign: 'left', color: theme.primaryText, fontWeight: '600' }}>Policy Name</th>
                        <th style={{ padding: '12px', textAlign: 'left', color: theme.primaryText, fontWeight: '600' }}>Platforms</th>
                        <th style={{ padding: '12px', textAlign: 'left', color: theme.primaryText, fontWeight: '600' }}>Technologies</th>
                        <th style={{ padding: '12px', textAlign: 'left', color: theme.primaryText, fontWeight: '600' }}>Created Date</th>
                        <th style={{ padding: '12px', textAlign: 'left', color: theme.primaryText, fontWeight: '600' }}>Policy ID</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        try {
                          const filteredPolicies = filterByPlatform(configurationPolicies)
                          console.log('Filtered configuration policies:', filteredPolicies)
                          
                          if (!filteredPolicies || filteredPolicies.length === 0) {
                            return (
                              <tr>
                                <td colSpan="5" style={{ padding: '12px', color: theme.secondaryText, textAlign: 'center' }}>
                                  No configuration policies found
                                </td>
                              </tr>
                            )
                          }
                          
                          return filteredPolicies.map((policy, index) => {
                            console.log(`Policy ${index}:`, policy)
                            
                            return (
                              <tr key={policy.id || `policy-${index}`} style={{ borderBottom: `1px solid ${theme.border}` }}>
                                <td style={{ padding: '12px', color: theme.primaryText }}>
                                  {policy.name || policy.displayName || 'N/A'}
                                </td>
                                <td style={{ padding: '12px', color: theme.secondaryText }}>
                                  {(() => {
                                    if (policy.platforms && Array.isArray(policy.platforms)) {
                                      return policy.platforms.join(', ')
                                    }
                                    if (policy.platforms && typeof policy.platforms === 'string') {
                                      return policy.platforms
                                    }
                                    // Check for other possible platform fields
                                    if (policy.supportedPlatforms && Array.isArray(policy.supportedPlatforms)) {
                                      return policy.supportedPlatforms.join(', ')
                                    }
                                    return 'N/A'
                                  })()}
                                </td>
                                <td style={{ padding: '12px', color: theme.secondaryText }}>
                                  {(() => {
                                    if (policy.technologies && Array.isArray(policy.technologies)) {
                                      return policy.technologies.join(', ')
                                    }
                                    if (policy.technologies && typeof policy.technologies === 'string') {
                                      return policy.technologies
                                    }
                                    // Check for other possible technology fields
                                    if (policy.settingTypes && Array.isArray(policy.settingTypes)) {
                                      return policy.settingTypes.join(', ')
                                    }
                                    return 'N/A'
                                  })()}
                                </td>
                                <td style={{ padding: '12px', color: theme.secondaryText }}>
                                  {formatDate(policy.createdDateTime)}
                                </td>
                                <td style={{ padding: '12px', color: theme.secondaryText, fontFamily: 'monospace', fontSize: '10px' }}>
                                  {policy.id || 'N/A'}
                                </td>
                              </tr>
                            )
                          })
                        } catch (err) {
                          console.error('Error rendering configuration policies:', err)
                          console.log('Configuration policies data:', configurationPolicies)
                          return (
                            <tr>
                              <td colSpan="5" style={{ padding: '12px', color: theme.secondaryText, textAlign: 'center' }}>
                                Error displaying configuration policies: {err.message}
                              </td>
                            </tr>
                          )
                        }
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Resource Access Profiles */}
            {resourceAccessProfiles.length > 0 && (
              <div style={{ marginBottom: '32px' }}>
                <h4 style={{ 
                  fontSize: '18px', 
                  fontWeight: '600', 
                  color: theme.primaryText, 
                  marginBottom: '16px' 
                }}>
                  🔐 Resource Access Profiles ({resourceAccessProfiles.length})
                </h4>
                <div style={{ 
                  border: `1px solid ${theme.border}`, 
                  borderRadius: '8px', 
                  overflow: 'hidden',
                  backgroundColor: theme.cardBg
                }}>
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
                        <th style={{ padding: '12px', textAlign: 'left', color: theme.primaryText, fontWeight: '600' }}>Profile Name</th>
                        <th style={{ padding: '12px', textAlign: 'left', color: theme.primaryText, fontWeight: '600' }}>Type</th>
                        <th style={{ padding: '12px', textAlign: 'left', color: theme.primaryText, fontWeight: '600' }}>Created Date</th>
                        <th style={{ padding: '12px', textAlign: 'left', color: theme.primaryText, fontWeight: '600' }}>Profile ID</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resourceAccessProfiles.map((profile, index) => (
                        <tr key={profile.id || index} style={{ borderBottom: `1px solid ${theme.border}` }}>
                          <td style={{ padding: '12px', color: theme.primaryText }}>{profile.displayName || 'N/A'}</td>
                          <td style={{ padding: '12px', color: theme.secondaryText }}>{profile['@odata.type']?.split('.').pop() || 'N/A'}</td>
                          <td style={{ padding: '12px', color: theme.secondaryText }}>{formatDate(profile.createdDateTime)}</td>
                          <td style={{ padding: '12px', color: theme.secondaryText, fontFamily: 'monospace', fontSize: '10px' }}>
                            {profile.id || 'N/A'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Mobile App Configurations */}
            {mobileAppConfigurations.length > 0 && (
              <div style={{ marginBottom: '32px' }}>
                <h4 style={{ 
                  fontSize: '18px', 
                  fontWeight: '600', 
                  color: theme.primaryText, 
                  marginBottom: '16px' 
                }}>
                  📱 Mobile App Configurations ({mobileAppConfigurations.length})
                </h4>
                <div style={{ 
                  border: `1px solid ${theme.border}`, 
                  borderRadius: '8px', 
                  overflow: 'hidden',
                  backgroundColor: theme.cardBg
                }}>
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
                        <th style={{ padding: '12px', textAlign: 'left', color: theme.primaryText, fontWeight: '600' }}>App Config Name</th>
                        <th style={{ padding: '12px', textAlign: 'left', color: theme.primaryText, fontWeight: '600' }}>Target App</th>
                        <th style={{ padding: '12px', textAlign: 'left', color: theme.primaryText, fontWeight: '600' }}>Created Date</th>
                        <th style={{ padding: '12px', textAlign: 'left', color: theme.primaryText, fontWeight: '600' }}>Config ID</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mobileAppConfigurations.map((config, index) => (
                        <tr key={config.id || index} style={{ borderBottom: `1px solid ${theme.border}` }}>
                          <td style={{ padding: '12px', color: theme.primaryText }}>{config.displayName || 'N/A'}</td>
                          <td style={{ padding: '12px', color: theme.secondaryText }}>{config.targetedMobileApps?.length || 0} apps</td>
                          <td style={{ padding: '12px', color: theme.secondaryText }}>{formatDate(config.createdDateTime)}</td>
                          <td style={{ padding: '12px', color: theme.secondaryText, fontFamily: 'monospace', fontSize: '10px' }}>
                            {config.id || 'N/A'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Group Policy Configurations */}
            {groupPolicyConfigurations.length > 0 && (
              <div style={{ marginBottom: '32px' }}>
                <h4 style={{ 
                  fontSize: '18px', 
                  fontWeight: '600', 
                  color: theme.primaryText, 
                  marginBottom: '16px' 
                }}>
                  🏢 Group Policy Configurations ({groupPolicyConfigurations.length})
                </h4>
                <div style={{ 
                  border: `1px solid ${theme.border}`, 
                  borderRadius: '8px', 
                  overflow: 'hidden',
                  backgroundColor: theme.cardBg
                }}>
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
                        <th style={{ padding: '12px', textAlign: 'left', color: theme.primaryText, fontWeight: '600' }}>Policy Name</th>
                        <th style={{ padding: '12px', textAlign: 'left', color: theme.primaryText, fontWeight: '600' }}>Definition Values</th>
                        <th style={{ padding: '12px', textAlign: 'left', color: theme.primaryText, fontWeight: '600' }}>Created Date</th>
                        <th style={{ padding: '12px', textAlign: 'left', color: theme.primaryText, fontWeight: '600' }}>Policy ID</th>
                      </tr>
                    </thead>
                    <tbody>
                      {groupPolicyConfigurations.map((policy, index) => (
                        <tr key={policy.id || index} style={{ borderBottom: `1px solid ${theme.border}` }}>
                          <td style={{ padding: '12px', color: theme.primaryText }}>{policy.displayName || 'N/A'}</td>
                          <td style={{ padding: '12px', color: theme.secondaryText }}>{policy.definitionValues?.length || 0} settings</td>
                          <td style={{ padding: '12px', color: theme.secondaryText }}>{formatDate(policy.createdDateTime)}</td>
                          <td style={{ padding: '12px', color: theme.secondaryText, fontFamily: 'monospace', fontSize: '10px' }}>
                            {policy.id || 'N/A'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Device Configurations (Legacy) */}
            {configurations.length > 0 && (
              <div style={{ marginBottom: '32px' }}>
                <h4 style={{ 
                  fontSize: '18px', 
                  fontWeight: '600', 
                  color: theme.primaryText, 
                  marginBottom: '16px' 
                }}>
                  📊 Device Configurations - Legacy ({configurations.length})
                </h4>
                <div style={{ 
                  border: `1px solid ${theme.border}`, 
                  borderRadius: '8px', 
                  overflow: 'hidden',
                  backgroundColor: theme.cardBg
                }}>
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
                        <th style={{ padding: '12px', textAlign: 'left', color: theme.primaryText, fontWeight: '600' }}>Configuration Name</th>
                        <th style={{ padding: '12px', textAlign: 'left', color: theme.primaryText, fontWeight: '600' }}>Created Date</th>
                        <th style={{ padding: '12px', textAlign: 'left', color: theme.primaryText, fontWeight: '600' }}>Last Modified</th>
                        <th style={{ padding: '12px', textAlign: 'left', color: theme.primaryText, fontWeight: '600' }}>Configuration ID</th>
                      </tr>
                    </thead>
                    <tbody>
                      {configurations.map((config, index) => (
                        <tr key={config.id || index} style={{ borderBottom: `1px solid ${theme.border}` }}>
                          <td style={{ padding: '12px', color: theme.primaryText }}>{config.displayName || 'N/A'}</td>
                          <td style={{ padding: '12px', color: theme.secondaryText }}>{formatDate(config.createdDateTime)}</td>
                          <td style={{ padding: '12px', color: theme.secondaryText }}>{formatDate(config.lastModifiedDateTime)}</td>
                          <td style={{ padding: '12px', color: theme.secondaryText, fontFamily: 'monospace', fontSize: '10px' }}>
                            {config.id || 'N/A'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
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