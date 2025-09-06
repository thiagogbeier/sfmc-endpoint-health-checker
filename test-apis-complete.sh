#!/bin/bash

echo "🔍 Testing SFMC Health Checker APIs..."
echo

echo "1. Testing Backend Health Endpoint:"
curl -s -X GET http://localhost:3001/api/health | jq .
echo

echo "2. Testing Health Check API with sample URLs:"
curl -s -X POST http://localhost:3001/api/health-check \
  -H "Content-Type: application/json" \
  -d '{"urls":[
    {"id":1,"url":"https://www.google.com","enabled":true},
    {"id":2,"url":"https://httpbin.org/status/200","enabled":true},
    {"id":3,"url":"https://mam-tun-1.letsintune.com","enabled":true}
  ]}' | jq .
echo

echo "3. Testing SSL Inspection API:"
curl -s -X POST http://localhost:3001/api/ssl-inspect \
  -H "Content-Type: application/json" \
  -d '{"hostname":"www.google.com","port":443}' | jq .
echo

echo "✅ All tests completed!"
