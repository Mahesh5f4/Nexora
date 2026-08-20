import requests
import time

url = 'http://127.0.0.1:8002/internal/agent/stream'
headers = { 'Authorization': 'Bearer super-secret-dev-token', 'Content-Type': 'application/json' }
data = { 'query': 'Write a 100 word essay about dogs', 'userId': '1', 'topK': 5, 'conversationId': 'test', 'history': [] }

print(f"Starting request at {time.time()}")
response = requests.post(url, headers=headers, json=data, stream=True)
for line in response.iter_lines():
    print(time.time(), line)
