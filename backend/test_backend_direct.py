import jwt
import requests
import datetime
import time
import json

url = 'http://localhost:8081/api/ai/generate'
headers = {
    'Content-Type': 'application/json'
}
data = {
    "prompt": "Who created you?",
    "systemPrompt": "You are a helpful assistant",
    "model": "openrouter/auto"
}

r = requests.post(url, headers=headers, json=data)
print(r.status_code)
print(r.text)
