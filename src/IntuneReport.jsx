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

  // Main component JSX will go here
  return (
    <div>
      <h1>Intune Report - CloudPC functionality coming soon</h1>
    </div>
  )
}