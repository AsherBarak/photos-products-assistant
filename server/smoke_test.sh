#!/bin/bash
# Quick smoke test — sends a chat message and prints the response
BASE_URL="${1:-http://localhost:8000}"

echo "=== Smoke Test ==="
echo "1. Health check..."
curl -s "$BASE_URL/" | python3 -m json.tool

echo -e "\n2. Chat test..."
curl -s -X POST "$BASE_URL/chat" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "Hi, I want to make a photo album"}],
    "summary": {
      "important_days": [{"date": "2024-03-01", "count": 45}],
      "trips": [
        {"start_date": "2024-01-01", "end_date": "2024-01-07", "title": "Greece Trip"},
        {"start_date": "2023-05-10", "end_date": "2023-05-15", "title": "Tehran Trip"}
      ]
    }
  }' | python3 -c "
import sys, json
data = json.load(sys.stdin)
print(f\"  Response: {data['response'][:200]}\")
if data.get('picker'):
    print(f\"  Picker: {[o['label'] for o in data['picker']['options']]}\")
else:
    print('  Picker: None')
"
echo -e "\n=== Done ==="
