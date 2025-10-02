#!/bin/bash

# Load environment variables
source "$(dirname "$0")/../../intercom_sync/.env"

# Test 1: Create Intercom contact WITH external_id
echo "Test 1: Creating Intercom contact with external_id..."
TIMESTAMP=$(date +%s)
RESPONSE=$(curl -s -X POST 'https://api.intercom.io/contacts' \
  -H "Authorization: Bearer $INTERCOM_API_KEY" \
  -H "Content-Type: application/json" \
  -H "Intercom-Version: 2.11" \
  -d "{
    \"role\": \"user\",
    \"email\": \"test-ext-$TIMESTAMP@example.com\",
    \"name\": \"Test External ID\",
    \"external_id\": \"KEAP-TEST-$TIMESTAMP\"
  }")

echo "$RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'✅ Created: {d.get(\"id\")}, external_id: {d.get(\"external_id\")}')" 2>&1 || echo "$RESPONSE"

echo ""
echo "Test 2: Update existing contact to SET external_id..."
CONTACT_ID="6495a1b67bfb0706982a8bf0"
RESPONSE2=$(curl -s -X PUT "https://api.intercom.io/contacts/$CONTACT_ID" \
  -H "Authorization: Bearer $INTERCOM_API_KEY" \
  -H "Content-Type: application/json" \
  -H "Intercom-Version: 2.11" \
  -d "{
    \"role\": \"user\",
    \"external_id\": \"KEAP-999999\"
  }")

echo "$RESPONSE2" | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'✅ Updated: {d.get(\"id\")}, external_id: {d.get(\"external_id\")}')" 2>&1 || echo "$RESPONSE2"

echo ""
echo "Test 3: Verify the update worked..."
sleep 2
RESPONSE3=$(curl -s -X GET "https://api.intercom.io/contacts/$CONTACT_ID" \
  -H "Authorization: Bearer $INTERCOM_API_KEY" \
  -H "Intercom-Version: 2.11")

echo "$RESPONSE3" | python3 -c "import sys,json; d=json.load(sys.stdin); ext_id=d.get('external_id'); print(f'✅ VERIFIED: external_id = {ext_id}' if ext_id else '❌ FAILED: external_id still null')" 2>&1 || echo "$RESPONSE3"