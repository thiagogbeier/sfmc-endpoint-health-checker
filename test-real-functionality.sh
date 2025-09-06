#!/bin/bash

echo "🧪 Testing SFMC Health Checker Real Functionality"
echo "=================================================="

# Check if backend is running
echo "1. Checking backend server..."
HEALTH=$(curl -s http://localhost:3001/api/health 2>/dev/null)
if [ $? -eq 0 ]; then
    echo "✅ Backend server is running"
    echo "   Response: $HEALTH"
else
    echo "❌ Backend server is not running"
    echo "   Please run: cd backend && npm run dev"
    exit 1
fi

echo ""
echo "2. Testing Health Check API..."
echo "   Testing URLs: google.com, github.com, invalid-domain.com"

HEALTH_RESULT=$(curl -s -X POST http://localhost:3001/api/health-check \
  -H "Content-Type: application/json" \
  -d '{
    "urls": [
      {"id": 1, "url": "https://google.com", "enabled": true},
      {"id": 2, "url": "https://github.com", "enabled": true},
      {"id": 3, "url": "https://invalid-domain-12345.com", "enabled": true}
    ]
  }')

echo "$HEALTH_RESULT" | jq '.results[] | {url: .url, status: .status, responseTime: .responseTime, message: .message}'

echo ""
echo "3. Testing SSL Inspection API..."
echo "   Testing SSL certificates: google.com, github.com, mam-tun-4.letsintune.com"

SSL_RESULT=$(curl -s -X POST http://localhost:3001/api/ssl-inspect \
  -H "Content-Type: application/json" \
  -d '{
    "urls": [
      {"id": 1, "url": "google.com", "enabled": true},
      {"id": 2, "url": "github.com", "enabled": true},
      {"id": 3, "url": "mam-tun-4.letsintune.com", "enabled": true}
    ]
  }')

echo "$SSL_RESULT" | jq '.results[] | {hostname: .hostname, status: .status, message: .message, certificate: .certificate}'

echo ""
echo "4. System Information..."
SYSTEM_INFO=$(curl -s http://localhost:3001/api/system-info)
echo "$SYSTEM_INFO" | jq '{nodejs: .nodejs, openssl: .openssl, platform: .platform}'

echo ""
echo "🎉 Real functionality testing complete!"
echo ""
echo "Next steps:"
echo "1. Start frontend: npm run dev (in main directory)"
echo "2. Open: http://localhost:5173"
echo "3. Test with real URLs in the web interface"
