#!/bin/bash

echo "🧪 SFMC Health Checker - Complete API Test Suite"
echo "================================================="

# Test 1: Backend Health Check
echo -e "\n1️⃣ Testing Backend Health..."
curl -s http://localhost:3001/api/health | jq .

# Test 2: System Info
echo -e "\n2️⃣ Testing System Info..."
curl -s http://localhost:3001/api/system-info | jq .

# Test 3: Health Check API
echo -e "\n3️⃣ Testing Health Check API..."
curl -s -X POST http://localhost:3001/api/health-check \
  -H "Content-Type: application/json" \
  -d '{"urls":[
    {"id":1,"url":"https://www.google.com","enabled":true},
    {"id":2,"url":"https://github.com","enabled":true},
    {"id":3,"url":"https://nonexistent-domain-12345.com","enabled":true}
  ]}' | jq .

# Test 4: SSL Inspection API
echo -e "\n4️⃣ Testing SSL Inspection API..."
curl -s -X POST http://localhost:3001/api/ssl-inspect \
  -H "Content-Type: application/json" \
  -d '{"urls":[
    {"id":1,"url":"www.google.com","enabled":true},
    {"id":2,"url":"github.com","enabled":true},
    {"id":3,"url":"mam-tun-4.letsintune.com","enabled":true}
  ]}' | jq .

echo -e "\n✅ Test suite completed!"
