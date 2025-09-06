#!/bin/bash

echo "🚀 Starting SFMC Health Checker Servers"
echo "======================================="

# Kill any existing processes
pkill -f "node server.js" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true

echo "📡 Starting Backend Server..."
cd /workspaces/sfmc-endpoint-health-checker/backend
nohup node server.js > backend.log 2>&1 &
BACKEND_PID=$!

sleep 3

# Test backend
if curl -s http://localhost:3001/api/health > /dev/null; then
    echo "✅ Backend running on http://localhost:3001"
else
    echo "❌ Backend failed to start"
    cat backend.log
    exit 1
fi

echo "🌐 Starting Frontend Server..."
cd /workspaces/sfmc-endpoint-health-checker
nohup npm run dev > frontend.log 2>&1 &
FRONTEND_PID=$!

sleep 3

echo ""
echo "🎉 SERVERS READY!"
echo "=================="
echo "Backend:  http://localhost:3001"
echo "Frontend: http://localhost:5173/sfmc-endpoint-health-checker/"
echo ""
echo "Quick test:"
echo "curl -X POST http://localhost:3001/api/ssl-inspect -H 'Content-Type: application/json' -d '{\"urls\":[{\"id\":1,\"url\":\"www.google.com\",\"enabled\":true}]}'"
