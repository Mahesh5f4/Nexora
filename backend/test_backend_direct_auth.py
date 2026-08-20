import jwt
import requests
import datetime
import time
import json

# Create JWT token
secret = "mysecretkeymysecretkeymysecretkey123456"
payload = {
    "sub": "nexora@admin.com",
    "role": "ADMIN",
    "iat": int(time.time()),
    "exp": int(time.time()) + 86400
}
token = jwt.encode(payload, secret, algorithm="HS256")

url = 'http://localhost:8081/api/ai/generate'
headers = {
    'Content-Type': 'application/json',
    'Authorization': f'Bearer {token}'
}
data = {
    "prompt": "Who created you?",
    "systemPrompt": "You are a helpful assistant",
    "model": "openrouter/auto"
}

r = requests.post(url, headers=headers, json=data)
print(r.status_code)
print(r.text)
