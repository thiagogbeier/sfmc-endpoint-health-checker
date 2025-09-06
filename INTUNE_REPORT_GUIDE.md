# Microsoft Intune Report Feature Guide

## 📱 Overview
The **Intune Report** feature provides access to Microsoft Intune device information through Microsoft Graph API. This feature allows CSA engineers to retrieve and analyze device data directly from their Intune tenant.

---

## 🔐 Authentication Requirements

### Required Permissions
To use this feature, you need an **Azure AD App Registration** with the following Microsoft Graph API permissions:

#### Application Permissions (Recommended)
- `DeviceManagementManagedDevices.Read.All`
- `DeviceManagementApps.Read.All`

#### Delegated Permissions (Alternative)
- `DeviceManagementManagedDevices.Read`
- `DeviceManagementApps.Read`

### Access Token Generation
You'll need a valid Microsoft Graph API access token. This can be obtained through:

1. **Azure Portal App Registration**
2. **PowerShell/CLI authentication**
3. **Postman or API testing tools**
4. **Custom authentication flow**

#### Example PowerShell Command:
```powershell
# Install required modules
Install-Module Microsoft.Graph -Force
Import-Module Microsoft.Graph.Authentication

# Connect and get token
Connect-MgGraph -Scopes "DeviceManagementManagedDevices.Read.All","DeviceManagementApps.Read.All"
$token = [Microsoft.Graph.PowerShell.Authentication.GraphSession]::Instance.AuthContext.TokenCache.ReadItems() | Where-Object {$_.Resource -eq "https://graph.microsoft.com/"} | Select-Object -First 1
Write-Host $token.AccessToken
```

---

## 🛠️ Available API Endpoints

### 1. 📱 Managed Devices
**Endpoint:** `GET /deviceManagement/managedDevices`

**Description:** Retrieves all managed devices in the Intune tenant.

**Returned Data:**
- Device name and ID
- Operating system and version
- Compliance state
- User information
- Last sync date/time
- Serial number
- Hardware details

### 2. 📦 Detected Apps
**Endpoint:** `GET /deviceManagement/detectedApps`

**Description:** Retrieves all detected applications across managed devices.

**Returned Data:**
- Application name and version
- Publisher information
- Platform (Windows, iOS, Android, etc.)
- Device count
- App ID

### 3. 🔗 App-Specific Devices
**Endpoint:** `GET /deviceManagement/detectedApps/{detectedAppId}/managedDevices`

**Description:** Retrieves devices that have a specific detected application installed.

**Required Input:**
- `App ID`: The unique identifier of the detected application

### 4. 👤 User-Specific Devices
**Endpoint:** `GET /deviceManagement/detectedApps/{detectedAppId}/managedDevices/{managedDeviceId}/users/{userId}/managedDevices`

**Description:** Retrieves devices associated with a specific user in the context of a detected app.

**Required Inputs:**
- `App ID`: The detected application ID
- `Device ID`: The managed device ID
- `User ID`: The user's unique identifier

---

## 🎯 Feature Capabilities

### 🌙 Theme Support
- Full light/dark mode compatibility
- SFMC branding consistency
- Responsive design for various screen sizes

### 📊 Data Display
- **Sortable Tables**: Professional data presentation
- **Color-Coded Status**: Compliance states with visual indicators
- **Responsive Layout**: Mobile and desktop friendly
- **Real-time Loading**: Progress indicators during API calls

### 📤 Export Options
- **JSON Export**: Download complete results as JSON files
- **Clipboard Copy**: Copy formatted data for sharing
- **Timestamped Files**: Automatic filename generation with timestamps

### 🔍 Data Filtering
- **Tab-based Navigation**: Switch between different data types
- **Input Validation**: Required field checking
- **Error Handling**: Comprehensive error messages and troubleshooting

---

## 🚀 Usage Instructions

### Step 1: Authentication
1. Navigate to the **"📱 Intune Report"** tab
2. Enter your **Access Token** in the authentication section
3. Optionally, provide your **Tenant ID** for additional context

### Step 2: Select Data Type
Choose from the available tabs:
- **📱 Managed Devices**: All devices in your tenant
- **📦 Detected Apps**: All detected applications
- **🔗 App Devices**: Devices with specific apps
- **👤 User Devices**: User-specific device data

### Step 3: Fetch Data
1. Click the **"🚀 Fetch Data"** button
2. Wait for the API call to complete
3. Review the results in the table format

### Step 4: Export Results (Optional)
- Use **"📥 Export JSON"** to download data
- Use **"📋 Copy to Clipboard"** for sharing

---

## 🛡️ Security Considerations

### Token Security
- **Never share access tokens** in logs or screenshots
- Use **password input fields** to hide tokens
- **Rotate tokens regularly** following security best practices

### Permissions
- Request **minimum required permissions** only
- Use **application permissions** for server-to-server scenarios
- Use **delegated permissions** for user-context scenarios

### Data Handling
- **No data is stored** on the health checker server
- All API calls are made **directly from the browser**
- **Export functionality** creates local files only

---

## ⚠️ Troubleshooting

### Common Issues

#### "HTTP 401: Unauthorized"
- **Cause**: Invalid or expired access token
- **Solution**: Generate a new access token with proper permissions

#### "HTTP 403: Forbidden"
- **Cause**: Insufficient permissions
- **Solution**: Ensure app registration has required Microsoft Graph permissions

#### "Network Error"
- **Cause**: CORS issues or network connectivity
- **Solution**: Check network connection and browser console for details

#### "No Data Returned"
- **Cause**: Empty tenant or permission scope issues
- **Solution**: Verify tenant has managed devices and permissions are granted

### Error Messages
The application provides detailed error messages including:
- HTTP status codes
- API response details
- Troubleshooting suggestions

---

## 📋 Sample Use Cases

### 1. Device Compliance Audit
Use the **Managed Devices** tab to:
- Review compliance status across all devices
- Identify non-compliant devices requiring attention
- Export compliance reports for stakeholders

### 2. Application Inventory
Use the **Detected Apps** tab to:
- Audit installed applications across the environment
- Identify unauthorized or outdated software
- Plan application deployment strategies

### 3. User Device Analysis
Use the **User Devices** tab to:
- Analyze device assignments per user
- Troubleshoot user-specific device issues
- Plan device refresh cycles

### 4. Security Assessment
Combine multiple data sources to:
- Identify security risks and vulnerabilities
- Monitor device enrollment trends
- Generate executive reports

---

## 🔄 Integration with SFMC Health Checker

The Intune Report feature seamlessly integrates with the existing SFMC Health Checker:

- **Consistent UI/UX**: Same theme and navigation patterns
- **Export Compatibility**: Similar export formats and functionality
- **Professional Branding**: SFMC colors and styling maintained
- **Dark Mode Support**: Full light/dark theme compatibility

---

## 🎯 Future Enhancements

Potential improvements for future versions:
- **Automatic token refresh** capabilities
- **Scheduled data collection** and reporting
- **Advanced filtering and search** functionality
- **Chart visualizations** for device and app data
- **Integration with other Microsoft 365** services
- **Bulk device management** actions
- **Historical data tracking** and trends
- **Custom report templates** and formats

---

## 📝 Technical Notes

### Browser Compatibility
- **Modern browsers required** (Chrome, Firefox, Safari, Edge)
- **JavaScript enabled** for API calls
- **CORS handling** via browser security policies

### Performance
- **API rate limiting** awareness built-in
- **Progressive loading** for large datasets
- **Responsive design** for mobile devices
- **Efficient table rendering** for thousands of records

### Dependencies
- **React 18.3.1**: Frontend framework
- **Microsoft Graph API v1.0**: Data source
- **Vite 5.4.19**: Development and build tool
- **Native browser APIs**: Fetch, clipboard, file download

---

This feature empowers SFMC CSA engineers with direct access to Intune device data, enabling comprehensive device management and reporting capabilities within the familiar health checker interface.
