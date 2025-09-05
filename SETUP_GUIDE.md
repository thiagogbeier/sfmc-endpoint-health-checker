# Complete Setup Guide: SFMC Endpoint Health Checker Development Environment

Here's a step-by-step guide to replicate this entire setup on your new Surface device:

## 1. Install Required Software

### A. Install Git
1. Download Git from: https://git-scm.com/download/win
2. Run installer with default settings
3. Verify installation: Open Command Prompt and run `git --version`

### B. Install Node.js
1. Download Node.js LTS from: https://nodejs.org/
2. Install with default settings (includes npm)
3. Verify installation: `node --version` and `npm --version`

### C. Install VS Code
1. Download from: https://code.visualstudio.com/
2. Install with default settings
3. Install recommended extensions:
   - ES7+ React/Redux/React-Native snippets
   - Prettier - Code formatter
   - Live Server
   - GitLens

## 2. Clone and Setup the Project

### A. Clone the Repository
```bash
# Open Command Prompt or PowerShell
git clone https://github.com/thiagogbeier/sfmc-endpoint-health-checker.git
cd sfmc-endpoint-health-checker
```

### B. Install Dependencies
```bash
npm install
```

## 3. Project Structure Understanding

```
sfmc-endpoint-health-checker/
├── .github/
│   └── workflows/
│       └── deploy.yml          # GitHub Actions deployment
├── public/
│   ├── .nojekyll              # GitHub Pages configuration
│   └── logo.png               # SFMC logo
├── src/
│   ├── App.jsx                # Main application component
│   ├── main.jsx               # React entry point
│   └── SimpleApp.jsx          # Test component (can delete)
├── index.html                 # HTML template
├── package.json               # Dependencies and scripts
├── vite.config.js            # Vite build configuration
└── README.md
```

## 4. Development Workflow

### A. Local Development
```bash
# Start development server
npm run dev

# Open browser to: http://localhost:5173
# Hot reload enabled - changes appear instantly
```

### B. Build and Test Locally
```bash
# Build for production
npm run build

# Test built version locally
npx serve dist
# Opens at: http://localhost:3000
```

### C. Deploy to GitHub Pages
```bash
# Simply push to main branch
git add .
git commit -m "Your changes"
git push origin main

# GitHub Actions automatically deploys to:
# https://yourusername.github.io/sfmc-endpoint-health-checker/
```

## 5. Key Configuration Files

### A. `vite.config.js` - Build Configuration
```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/sfmc-endpoint-health-checker/', // Your repo name
  build: {
    outDir: 'dist',
    assetsDir: 'assets'
  }
})
```

### B. `package.json` - Scripts and Dependencies
```json
{
  "name": "sfmc-endpoint-health-checker",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.1",
    "vite": "^5.4.6"
  }
}
```

### C. `.github/workflows/deploy.yml` - Auto-Deployment
```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    
    permissions:
      contents: read
      pages: write
      id-token: write
    
    steps:
    - name: Checkout
      uses: actions/checkout@v4
      
    - name: Setup Node
      uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'npm'
        
    - name: Install dependencies
      run: npm ci
      
    - name: Build
      run: npm run build
      
    - name: Setup Pages
      uses: actions/configure-pages@v4
      
    - name: Upload artifact
      uses: actions/upload-pages-artifact@v3
      with:
        path: './dist'
        
    - name: Deploy to GitHub Pages
      id: deployment
      uses: actions/deploy-pages@v4
```

## 6. Creating a New Similar Project from Scratch

### A. Initialize New Project
```bash
# Create new Vite React project
npm create vite@latest my-new-app -- --template react
cd my-new-app
npm install
```

### B. Configure for GitHub Pages
1. Update `vite.config.js`:
```javascript
export default defineConfig({
  plugins: [react()],
  base: '/your-repo-name/', // Change this
  build: {
    outDir: 'dist',
    assetsDir: 'assets'
  }
})
```

2. Create `.github/workflows/deploy.yml` (copy from above)
3. Create `public/.nojekyll` (empty file)

### C. Setup GitHub Repository
1. Create new repo on GitHub
2. Initialize git and push:
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/yourusername/your-repo-name.git
git push -u origin main
```

3. Configure GitHub Pages:
   - Go to repo Settings → Pages
   - Source: "GitHub Actions"
   - Save

## 7. Common Commands Reference

```bash
# Development
npm run dev              # Start dev server
npm run build           # Build for production
npm run preview         # Preview built app

# Git workflow
git status              # Check changes
git add .               # Stage all changes
git commit -m "message" # Commit with message
git push origin main    # Push to GitHub (auto-deploys)

# Troubleshooting
npm ci                  # Clean install dependencies
npm run build           # Test build locally
npx serve dist          # Test built app
```

## 8. Important Notes

### A. GitHub Pages Configuration
- **Source**: Must be set to "GitHub Actions" (not branch)
- **Base path**: Must match your repository name in `vite.config.js`
- **Environment**: The workflow requires `github-pages` environment

### B. Development Tips
- Use `npm run dev` for development (hot reload)
- Always test with `npm run build` before pushing
- Check GitHub Actions tab for deployment status
- Browser cache: Use Ctrl+F5 for hard refresh when testing

### C. File Safety
- `public/.nojekyll` - Required for GitHub Pages
- `src/main.jsx` - Entry point, don't modify React.StrictMode
- `index.html` - Template, Vite processes this automatically

## 9. Customization for New Projects

To adapt this setup for other projects:

1. **Change repository name** in `vite.config.js` base path
2. **Update package.json** name and version
3. **Modify workflow name** in `deploy.yml`
4. **Replace App.jsx** with your own components
5. **Update title** in `index.html`

This setup gives you a complete React development environment with automatic GitHub Pages deployment! 🚀

## 10. Testing Strategy for App Improvements

### A. Branch-Based Development (Recommended)

#### 1. Create Feature Branches
```bash
# Create and switch to a new feature branch
git checkout -b feature/improved-ui
git checkout -b feature/new-health-checks
git checkout -b hotfix/bug-fix

# Work on your improvements
# Make commits as you develop
git add .
git commit -m "Add improved dashboard design"

# Push branch to GitHub
git push origin feature/improved-ui
```

#### 2. Test Branch Deployment
Create a separate deployment workflow for branches:

Create `.github/workflows/deploy-preview.yml`:
```yaml
name: Deploy Preview Branch

on:
  push:
    branches-ignore: [ main ]

jobs:
  deploy-preview:
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout
      uses: actions/checkout@v4
      
    - name: Setup Node
      uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'npm'
        
    - name: Install dependencies
      run: npm ci
      
    - name: Build
      run: npm run build
      
    - name: Deploy to Surge.sh
      run: |
        npm install -g surge
        surge ./dist --domain ${{ github.event.repository.name }}-${{ github.ref_name }}.surge.sh --token ${{ secrets.SURGE_TOKEN }}
```

### B. Fork-Based Development

#### 1. Create Your Own Fork
```bash
# On GitHub, click "Fork" button on your repository
# Clone your fork
git clone https://github.com/yourusername/sfmc-endpoint-health-checker-dev.git
cd sfmc-endpoint-health-checker-dev

# Add original as upstream
git remote add upstream https://github.com/thiagogbeier/sfmc-endpoint-health-checker.git
```

#### 2. Configure Fork for Testing
Update `vite.config.js` in your fork:
```javascript
export default defineConfig({
  plugins: [react()],
  base: '/sfmc-endpoint-health-checker-dev/', // Fork repo name
  build: {
    outDir: 'dist',
    assetsDir: 'assets'
  }
})
```

Your fork will deploy to:
`https://yourusername.github.io/sfmc-endpoint-health-checker-dev/`

### C. Local Testing Environment

#### 1. Multiple Local Versions
```bash
# Clone to different directories
git clone https://github.com/thiagogbeier/sfmc-endpoint-health-checker.git production-version
git clone https://github.com/thiagogbeier/sfmc-endpoint-health-checker.git development-version

# Work in development-version
cd development-version
git checkout -b experimental-features

# Test locally on different ports
cd production-version && npm run dev    # Port 5173
cd development-version && npm run dev   # Port 5174 (Vite auto-assigns)
```

#### 2. Environment-Based Configuration
Create multiple config files:

`vite.config.dev.js`:
```javascript
export default defineConfig({
  plugins: [react()],
  base: '/sfmc-health-checker-dev/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets'
  }
})
```

`package.json` scripts:
```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "build:dev": "vite build --config vite.config.dev.js",
    "preview": "vite preview",
    "deploy:dev": "npm run build:dev && gh-pages -d dist -r git@github.com:yourusername/sfmc-health-checker-dev.git"
  }
}
```

### D. Pull Request Workflow (Best Practice)

#### 1. Development Process
```bash
# 1. Create feature branch from main
git checkout main
git pull origin main
git checkout -b feature/advanced-analytics

# 2. Develop and test locally
npm run dev  # Test in development
npm run build && npx serve dist  # Test production build

# 3. Commit and push branch
git add .
git commit -m "Add advanced analytics dashboard"
git push origin feature/advanced-analytics

# 4. Create Pull Request on GitHub
# This triggers preview deployment (if configured)
```

#### 2. PR Preview Configuration
Add to `.github/workflows/pr-preview.yml`:
```yaml
name: PR Preview

on:
  pull_request:
    types: [opened, synchronize]

jobs:
  preview:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'npm'
    
    - run: npm ci
    - run: npm run build
    
    - name: Deploy PR Preview
      uses: peaceiris/actions-gh-pages@v3
      with:
        github_token: ${{ secrets.GITHUB_TOKEN }}
        publish_dir: ./dist
        destination_dir: pr-${{ github.event.number }}
        
    - name: Comment PR
      uses: actions/github-script@v6
      with:
        script: |
          github.rest.issues.createComment({
            issue_number: context.issue.number,
            owner: context.repo.owner,
            repo: context.repo.repo,
            body: '🚀 Preview deployed: https://${{ github.repository_owner }}.github.io/${{ github.event.repository.name }}/pr-${{ github.event.number }}/'
          })
```

### E. Recommended Testing Workflow

```bash
# 1. Start with a feature branch
git checkout -b feature/my-improvement

# 2. Develop locally with hot reload
npm run dev

# 3. Test production build locally
npm run build
npx serve dist

# 4. Push branch for team review (optional)
git push origin feature/my-improvement

# 5. Create Pull Request for code review

# 6. After approval, merge to main
git checkout main
git pull origin main
git merge feature/my-improvement
git push origin main

# 7. Delete feature branch
git branch -d feature/my-improvement
git push origin --delete feature/my-improvement
```

### F. Testing Checklist

Before merging improvements to main:

- [ ] **Local development works**: `npm run dev`
- [ ] **Production build succeeds**: `npm run build`
- [ ] **Built app works locally**: `npx serve dist`
- [ ] **All features tested manually**
- [ ] **No console errors in browser**
- [ ] **Responsive design tested (mobile/desktop)**
- [ ] **Performance acceptable** (check bundle size)
- [ ] **Accessibility tested** (keyboard navigation, screen readers)

## 11. Troubleshooting Common Issues

### A. Blank Page on GitHub Pages
- Check browser console for errors
- Verify `base` path in `vite.config.js` matches repo name
- Ensure GitHub Pages source is set to "GitHub Actions"
- Check if `.nojekyll` file exists in `public/` folder

### B. GitHub Actions Failing
- Check Actions tab for error details
- Verify workflow has `environment: github-pages`
- Ensure repository has Pages enabled in settings
- Check if all required permissions are set

### C. Local Development Issues
- Clear node_modules: `rm -rf node_modules && npm install`
- Check Node.js version compatibility
- Verify all dependencies are installed
- Use `npm run build` to test production build

### D. Asset Loading Problems
- Check file paths are relative to base
- Verify assets are in `public/` folder for static files
- Check network tab in browser dev tools
- Ensure correct MIME types for files
