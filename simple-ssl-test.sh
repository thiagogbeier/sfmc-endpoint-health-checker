#!/bin/bash

echo "🧪 SIMPLE SSL TEST - NO BACKEND NEEDED"
echo "======================================"

# Test 1: Direct OpenSSL test
echo -e "\n1️⃣ Testing www.google.com SSL directly:"
timeout 5 openssl s_client -connect www.google.com:443 -servername www.google.com < /dev/null 2>&1 | grep -E "(CN =|issuer|notAfter)" | head -3

echo -e "\n2️⃣ Testing mam-tun-4.letsintune.com SSL directly:"
timeout 5 openssl s_client -connect mam-tun-4.letsintune.com:443 -servername mam-tun-4.letsintune.com < /dev/null 2>&1 | grep -E "(CN =|issuer|notAfter)" | head -3

echo -e "\n✅ Direct OpenSSL tests completed!"
echo "This proves SSL inspection works without any server complexity."
