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
echo -e "\n3. Upload embeddings test..."
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/upload-embeddings" \
  -H "Content-Type: application/json" \
  -H "X-Client-Id: smoke-test-client" \
  -d '{
    "embeddings": [
      {"photo_id": "smoke1", "clip_embedding": [0.1, 0.2], "face_embedding": [0.3], "faces_detected": 1}
    ]
  }')
if [ "$STATUS" = "200" ]; then
  echo "  Upload embeddings: OK (200)"
else
  echo "  Upload embeddings: FAILED ($STATUS)"
fi

# Verify missing header returns 422
STATUS_NO_HEADER=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/upload-embeddings" \
  -H "Content-Type: application/json" \
  -d '{"embeddings": []}')
if [ "$STATUS_NO_HEADER" = "422" ]; then
  echo "  Missing header rejection: OK (422)"
else
  echo "  Missing header rejection: FAILED ($STATUS_NO_HEADER)"
fi

echo -e "\n=== Done ==="
