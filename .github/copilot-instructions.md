# Copilot Instructions — SFMC Endpoint Health Checker

> Purpose: Build a **60-minute SFMC CSA endpoint assessment tool**. Keep scope minimal. React + Vite. Client-side only with mock data.

## Project Context
- **Target Users**: SFMC CSA engineers and managers
- **Core Action**: Input endpoint URLs → Run health checks → View results → Export report
- **Tech Stack**: React + Vite single-page app (no backend required)
- **Time Constraint**: 60-minute MVP with 4 development phases
- **Demo Goal**: Functional tool for CSA workshop presentation

## Domain Knowledge
- **SFMC**: Salesforce Marketing Cloud (enterprise marketing platform)
- **CSA**: Customer Success Architects (technical specialists)
- **Endpoints**: API URLs that need health monitoring (ping, response time, availability)
- **Health Checks**: Simulated assessments showing green/red/yellow status
- **Report Export**: Formatted text output for sharing with stakeholders

## Guardrails
- **Client-side only** - no real API calls, use mock data simulation
- **Minimal dependencies** - prefer vanilla JS/CSS over libraries
- **Single page app** - no routing, keep everything in one view
- **Mock health checks** - simulate ping times, random pass/fail for demo
- **Export as text** - avoid complex PDF generation, use simple download/clipboard

## Build Flow (60-minute phases)
1. **Phase 1 (15 min)**: Form structure with URL inputs and basic state
2. **Phase 2 (20 min)**: Mock health check logic and results display
3. **Phase 3 (15 min)**: Export functionality (copy/download)
4. **Phase 4 (10 min)**: SFMC branding, loading states, polish

## SFMC-Specific Requirements
- **Input Form**: 
  - Multiple endpoint URL fields (max 5)
  - Optional basic auth fields
  - Response time threshold setting
- **Health Check Simulation**:
  - Mock response times (50-500ms range)
  - Status indicators: Healthy (green), Warning (yellow), Error (red)
  - Basic URL validation
- **Results Display**:
  - Table/grid format: URL | Status | Response Time | Notes
  - Color-coded visual feedback
  - Summary statistics (X/Y endpoints healthy)
- **Export Options**:
  - Copy formatted results to clipboard
  - Download as .txt file with timestamp
  - Include summary and detailed breakdown

## Suggested Prompts for This Project
- "Create the endpoint input form with validation for SFMC URLs"
- "Implement mock health check logic that simulates realistic response times and failures"
- "Build a results table with color-coded status indicators and SFMC branding"
- "Add export functionality to copy results as formatted text and download as file"
- "Create mock data for 5 sample SFMC endpoints with varied health states"
- "Add loading animations and success feedback for the health check process"
- "Apply SFMC blue/orange color scheme and professional styling"

## Quality Bar
- **Functional**: Complete input → check → results → export workflow
- **Fast**: User can complete assessment in <2 minutes
- **Reliable**: Consistent mock results, no console errors
- **Professional**: Clean UI suitable for CSA workshop demo
- **Exportable**: Working copy/download of formatted results

## SFMC Branding Guidelines
- **Primary Colors**: Salesforce blue (#0176D3), orange accent (#FF6B35)
- **Typography**: Clean, professional fonts (system defaults fine for MVP)
- **Status Colors**: Green (#04844B), Yellow (#FFB75D), Red (#EA001E)
- **Logo/Text**: "SFMC Endpoint Health Checker" as main heading

## Mock Data Strategy
- **Sample Endpoints**: Use realistic SFMC-style URLs (e.g., mc.salesforce.com, *.marketingcloud.com)
- **Response Times**: Vary between 45ms-800ms for realism
- **Failure Scenarios**: 20% failure rate, mix of timeouts and connection errors
- **Status Messages**: Professional language ("Endpoint responding normally", "High latency detected", "Connection timeout")
