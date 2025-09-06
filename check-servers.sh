#!/bin/bash

echo "🚀 SFMC Health Checker - Server Status"
echo "======================================"

# Check backend
echo "🔧 Backend Server:"
if curl -s http://localhost:3001/api/health >/dev/null 2>&1; then
    echo "✅ Backend running at http://localhost:3001"
    curl -s http://localhost:3001/api/health | jq -r '"   Status: " + .status + " | Version: " + .version'
else
    echo "❌ Backend not responding"
fi

echo ""

# Check frontend
echo "🖥️  Frontend Server:"
if curl -s http://localhost:5173 >/dev/null 2>&1; then
    echo "✅ Frontend running at http://localhost:5173/sfmc-endpoint-health-checker/"
    echo "   Ready for testing!"
else
    echo "❌ Frontend not responding"
fi

echo ""
echo "🧪 Quick SSL Test:"
curl -s -X POST http://localhost:3001/api/ssl-inspect \
  -H "Content-Type: application/json" \
  -d '{"urls":[{"id":"test","url":"www.google.com","enabled":true}]}' | \
  jq -r '.results[0] | "   www.google.com: " + .status + " (" + .message + ")"'

echo ""
echo "🎯 Next Steps:"
echo "   1. Open: http://localhost:5173/sfmc-endpoint-health-checker/"
echo "   2. Go to 'SSL Inspection' tab"
echo "   3. Test with: www.google.com or mam-tun-4.letsintune.com"
echo "   4. Check browser console (F12) if issues persist"
