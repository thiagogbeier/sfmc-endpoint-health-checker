#!/bin/bash

# Kill all existing processes
pkill -f "node server.js"
pkill -f "vite"
pkill -f "npm"

# Wait a moment
sleep 2

# Start backend
echo "Starting backend..."
cd /workspaces/sfmc-endpoint-health-checker/backend
node server.js &
BACKEND_PID=$!

# Wait for backend to start
sleep 3

# Start frontend
echo "Starting frontend..."
cd /workspaces/sfmc-endpoint-health-checker
npm run dev -- --host 0.0.0.0 &
FRONTEND_PID=$!

# Wait for frontend to start
sleep 5

echo "Backend PID: $BACKEND_PID"
echo "Frontend PID: $FRONTEND_PID"

# Test backend
echo "Testing backend..."
curl -s http://localhost:3001/api/health

echo ""
echo "=========================="
echo "🎯 READY TO TEST:"
echo "React App: http://localhost:5173/sfmc-endpoint-health-checker/"
echo "Simple Tester: file:///workspaces/sfmc-endpoint-health-checker/ssl-tester-final.html"
echo "=========================="
