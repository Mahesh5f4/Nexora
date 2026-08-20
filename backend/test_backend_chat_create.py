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

url = 'http://localhost:8081/api/ai/conversations'
headers = {
    'Content-Type': 'application/json',
    'Authorization': f'Bearer {token}'
}
data = {
    "role": "chat"
}

r = requests.post(url, headers=headers, json=data)
print("Create conversation:", r.status_code)
resp_json = r.json()
print(resp_json)
conv_id = resp_json['id']

url = f'http://localhost:8081/api/ai/conversations/{conv_id}/messages'
data = {
    "content": "Who created you?",
    "useWebSearch": False
}

r = requests.post(url, headers=headers, json=data)
print("Send message:", r.status_code)
print(r.text)
