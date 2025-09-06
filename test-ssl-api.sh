#!/bin/bash

echo "🧪 Testing SFMC SSL Inspection API"
echo "=================================="

echo ""
echo "1️⃣ Testing Google (should be valid):"
curl -s -X POST http://localhost:3001/api/ssl-inspect \
  -H "Content-Type: application/json" \
  -d '{"urls":[{"id":"test1","url":"www.google.com","enabled":true}]}' | \
  jq -r '.results[0] | "Status: \(.status) | Message: \(.message) | Valid until: \(.certificate.validTo)"'

echo ""
echo "2️⃣ Testing Corporate domain (should be warning):"
curl -s -X POST http://localhost:3001/api/ssl-inspect \
  -H "Content-Type: application/json" \
  -d '{"urls":[{"id":"test2","url":"mam-tun-4.letsintune.com","enabled":true}]}' | \
  jq -r '.results[0] | "Status: \(.status) | Message: \(.message) | Days until expiry: \(.certificate.daysUntilExpiry)"'

echo ""
echo "3️⃣ Testing GitHub (should be valid):"
curl -s -X POST http://localhost:3001/api/ssl-inspect \
  -H "Content-Type: application/json" \
  -d '{"urls":[{"id":"test3","url":"github.com","enabled":true}]}' | \
  jq -r '.results[0] | "Status: \(.status) | Message: \(.message) | Subject: \(.certificate.subject)"'

echo ""
echo "4️⃣ Testing expired certificate (should be expired/error):"
curl -s -X POST http://localhost:3001/api/ssl-inspect \
  -H "Content-Type: application/json" \
  -d '{"urls":[{"id":"test4","url":"expired.badssl.com","enabled":true}]}' | \
  jq -r '.results[0] | "Status: \(.status) | Message: \(.message)"'

echo ""
echo "✅ API Testing Complete!"
