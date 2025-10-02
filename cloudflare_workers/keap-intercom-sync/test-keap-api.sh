#!/bin/bash

source "/Users/meganharrison/Documents/github/ns projects/ns-ai-agent-mastery/ns_Agent_Deployment/intercom_sync/.env"
TIMESTAMP=$(date +%s)

echo "Test 1: Creating contact in Keap..."
RESPONSE=$(curl -s -X POST "https://api.infusionsoft.com/crm/rest/v1/contacts" \
  -H "Authorization: Bearer $KEAP_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"given_name\": \"Test\",
    \"family_name\": \"User$TIMESTAMP\",
    \"email_addresses\": [{
      \"email\": \"test-keap-$TIMESTAMP@example.com\",
      \"field\": \"EMAIL1\"
    }]
  }")

KEAP_ID=$(echo "$RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('id', ''))" 2>&1)

if [ -z "$KEAP_ID" ]; then
  echo "❌ FAILED to create contact"
  echo "$RESPONSE"
  exit 1
fi

echo "✅ Created Keap contact ID: $KEAP_ID"

echo ""
echo "Test 2: Search for contact by email..."
TEST_EMAIL="test-keap-$TIMESTAMP@example.com"
SEARCH_RESPONSE=$(curl -s -X GET "https://api.infusionsoft.com/crm/rest/v1/contacts?email=$TEST_EMAIL" \
  -H "Authorization: Bearer $KEAP_API_KEY" \
  -H "Accept: application/json")

echo "$SEARCH_RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); contacts=d.get('contacts',[]); print(f'✅ Found {len(contacts)} contact(s)' if contacts else '❌ Search returned 0 contacts')"

echo ""
echo "Test 3: Update contact..."
UPDATE_RESPONSE=$(curl -s -X PATCH "https://api.infusionsoft.com/crm/rest/v1/contacts/$KEAP_ID" \
  -H "Authorization: Bearer $KEAP_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"given_name": "Updated"}')

echo "$UPDATE_RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'✅ Updated contact, name: {d.get(\"given_name\")}' if 'id' in d else f'❌ Update failed')"
