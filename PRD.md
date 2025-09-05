# Product Requirements Document (PRD)
## SFMC Endpoint Health Checker

> **Vibe Coding Target**: 60-minute client-side web app for rapid endpoint assessment

## 1. Vision & Core Purpose
**Build a simple, fast web tool** where SFMC CSA engineers can:
1. **Input** endpoint URLs and basic config
2. **Run** simulated health checks (client-side logic)
3. **View** instant results with clear pass/fail status
4. **Export** a summary report

**One Core Action**: Submit endpoint details → Get instant health assessment

## 2. MVP User Flow (Single Page)
```
[Input Form] → [Check Button] → [Results Display] → [Export Summary]
```

**Primary User Journey**:
1. User enters 3-5 endpoint URLs in a form
2. Clicks "Run Health Check" 
3. See instant results (green/red status indicators)
4. Click "Export Report" to download/copy results
5. Done in <2 minutes total

**Key User Story**: *"As a CSA engineer, I want to quickly validate 5 endpoints and get a shareable report in under 2 minutes."*

## 3. Simplified Feature Scope

### Core MVP (Required - 45 mins)
- **Input Form**: 
  - Endpoint URL field (max 5 URLs)
  - Basic auth toggle (username/password)
  - Expected response time threshold
- **Mock Health Checks**: 
  - Simulated ping/response time
  - Basic URL validation
  - Random pass/fail for demo purposes
- **Results Display**: 
  - Simple grid: URL | Status | Response Time | Notes
  - Color-coded status (green=healthy, red=issues, yellow=warning)
- **Export Function**: 
  - Copy results to clipboard as formatted text
  - Download as simple .txt file

### Polish Layer (Stretch - 15 mins)
- Add SFMC branding colors
- Basic animations (loading spinner, success checkmarks)
- Input validation with helpful error messages
- Responsive design for mobile viewing

### Future Ideas (Post-MVP)
- Real API integration
- Historical data comparison
- Advanced filtering/sorting
- PDF export with charts

## 4. Technical Constraints for Vibe Coding
- **Client-side only** (no backend/database)
- **React + Vite** stack (already configured)
- **Minimal dependencies** (prefer vanilla JS/CSS)
- **Mock data** for health check simulation
- **Local storage** for temporary session data only
- **Build time**: 60 minutes maximum

## 5. Success Criteria
✅ **Functional**: User can input URLs, run checks, see results, export summary  
✅ **Fast**: Complete workflow in <2 minutes  
✅ **Usable**: Clean UI, no console errors, works on mobile  
✅ **Demo-ready**: Realistic mock data, consistent results  

## 6. Implementation Roadmap

### Step 1 (15 min): Basic Structure
- Form with URL inputs and submit button
- Results table/grid component
- Basic state management

### Step 2 (20 min): Core Logic
- Form validation and submission
- Mock health check simulation
- Results display with status indicators

### Step 3 (15 min): Export Feature
- Generate formatted report text
- Copy to clipboard functionality
- Download as file option

### Step 4 (10 min): Polish & Testing
- Add loading states and animations
- Apply SFMC colors/branding
- Test complete user flow and fix bugs
