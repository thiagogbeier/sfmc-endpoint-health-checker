#!/bin/bash

# SFMC Health Checker Auto-Start Script
# This script starts both backend and frontend servers and tests everything

set -e

echo "🚀 SFMC Health Checker Auto-Start & Test"
echo "========================================"

# Change to project directory
cd /workspaces/sfmc-endpoint-health-checker

# Kill any existing processes
echo "🧹 Cleaning up existing processes..."
pkill -f "node.*server.js" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true
pkill -f "npm.*dev" 2>/dev/null || true
sleep 2

# Start backend server
echo "🔧 Starting backend server..."
node backend/server.js &
BACKEND_PID=$!
echo "Backend PID: $BACKEND_PID"

# Wait for backend to start
echo "⏳ Waiting for backend to initialize..."
sleep 3

# Check backend health
echo "🔍 Testing backend health..."
if curl -s -f http://localhost:3001/api/health > /dev/null; then
    echo "✅ Backend is healthy!"
else
    echo "❌ Backend failed to start!"
    kill $BACKEND_PID 2>/dev/null || true
    exit 1
fi

# Start frontend server
echo "🎨 Starting frontend server..."
npm run dev -- --host 0.0.0.0 &
FRONTEND_PID=$!
echo "Frontend PID: $FRONTEND_PID"

# Wait for frontend to start
echo "⏳ Waiting for frontend to initialize..."
sleep 5

# Check frontend
echo "🔍 Testing frontend availability..."
if curl -s -f http://localhost:5173/sfmc-endpoint-health-checker/ > /dev/null; then
    echo "✅ Frontend is running!"
else
    echo "⚠️  Frontend might still be starting..."
fi

echo ""
echo "🎯 Running API Tests..."
echo "======================="

# Test Health Check API
echo "📊 Testing Health Check API..."
HEALTH_RESULT=$(curl -s -X POST http://localhost:3001/api/health-check \
  -H "Content-Type: application/json" \
  -d '{"urls":[
    {"id":1,"url":"https://www.google.com","enabled":true},
    {"id":2,"url":"https://httpbin.org/status/200","enabled":true},
    {"id":3,"url":"https://mam-tun-1.letsintune.com","enabled":true}
  ]}')

echo "Health Check Results:"
echo "$HEALTH_RESULT" | jq '.results[] | {url: .url, status: .status, responseTime: .responseTime, message: .message}'

echo ""

# Test SSL Inspection API
echo "🔒 Testing SSL Inspection API..."
SSL_RESULT=$(curl -s -X POST http://localhost:3001/api/ssl-inspect \
  -H "Content-Type: application/json" \
  -d '{"hostname":"www.google.com","port":443}')

echo "SSL Inspection Results:"
echo "$SSL_RESULT" | jq '{hostname: .hostname, status: .status, connected: .connected, responseTime: .responseTime, message: .message}'

echo ""
echo "🌐 Application URLs:"
echo "==================="
echo "Frontend: http://localhost:5173/sfmc-endpoint-health-checker/"
echo "Backend:  http://localhost:3001"
echo ""
echo "📋 Process Information:"
echo "======================"
echo "Backend PID:  $BACKEND_PID"
echo "Frontend PID: $FRONTEND_PID"
echo ""
echo "💡 To stop all servers:"
echo "kill $BACKEND_PID $FRONTEND_PID"
echo ""
echo "✅ All services started successfully!"
echo "🎉 Ready for testing!"

# Keep script running to monitor processes
trap 'echo "🛑 Stopping servers..."; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true; exit 0' INT

echo ""
echo "⌨️  Press Ctrl+C to stop all servers"
echo "🔄 Monitoring servers..."

# Monitor processes
while true; do
    if ! kill -0 $BACKEND_PID 2>/dev/null; then
        echo "❌ Backend server stopped unexpectedly!"
        break
    fi
    if ! kill -0 $FRONTEND_PID 2>/dev/null; then
        echo "❌ Frontend server stopped unexpectedly!"
        break
    fi
    sleep 5
done
