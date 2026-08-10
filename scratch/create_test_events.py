import requests
import json
from datetime import datetime, timedelta

BASE_URL = "http://localhost:8080"

def create_test_events():
    # 1. Login
    login_data = {
        "email": "admin@eventhub.com",
        "password": "admin123"
    }
    print("Logging in...")
    resp = requests.post(f"{BASE_URL}/auth/login", json=login_data)
    if resp.status_code != 200:
        print(f"Login failed: {resp.text}")
        return
    
    token = resp.json()['token']
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    print("Login successful!")

    # 2. Create Events
    now = datetime.now()
    events = [
        {
            "title": "AI & Future Tech Summit",
            "description": "A deep dive into Artificial Intelligence, Machine Learning, and the future of technology in 2024. Join industry experts for keynotes and workshops.",
            "location": "Innovation Hub, Bangalore",
            "startTime": (now + timedelta(days=10)).isoformat(),
            "endTime": (now + timedelta(days=10, hours=8)).isoformat(),
            "price": 1500.0,
            "totalSeats": 200,
            "imageUrl": "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&q=80&w=800"
        },
        {
            "title": "Machine Learning Masterclass",
            "description": "Hands-on workshop on Machine Learning, Neural Networks, and Deep Learning. Learn how to build AI models using Python and Scikit-learn.",
            "location": "Digital Center, Hyderabad",
            "startTime": (now + timedelta(days=12)).isoformat(),
            "endTime": (now + timedelta(days=12, hours=6)).isoformat(),
            "price": 1200.0,
            "totalSeats": 100,
            "imageUrl": "https://images.unsplash.com/photo-1555949963-ff9fe0c870eb?auto=format&fit=crop&q=80&w=800"
        },
        {
            "title": "Robotics & Automation Expo",
            "description": "Explore the latest in Robotics, Industrial Automation, and AI-driven hardware. Live demos of humanoid robots and automated systems.",
            "location": "Expo Mart, Delhi",
            "startTime": (now + timedelta(days=15)).isoformat(),
            "endTime": (now + timedelta(days=15, hours=10)).isoformat(),
            "price": 800.0,
            "totalSeats": 500,
            "imageUrl": "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&q=80&w=800"
        },
        {
            "title": "Vegan Food & Music Festival",
            "description": "Celebrate plant-based living with organic food stalls, live jazz music, and sustainability workshops. A family-friendly weekend event.",
            "location": "Green Park, Pune",
            "startTime": (now + timedelta(days=5)).isoformat(),
            "endTime": (now + timedelta(days=5, hours=12)).isoformat(),
            "price": 300.0,
            "totalSeats": 1000,
            "imageUrl": "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&q=80&w=800"
        }
    ]

    for event in events:
        print(f"Creating event: {event['title']}")
        r = requests.post(f"{BASE_URL}/events", json=event, headers=headers)
        if r.status_code == 200:
            print(f"Success! ID: {r.json()['data']['id']}")
        else:
            print(f"Failed: {r.text}")

if __name__ == "__main__":
    create_test_events()
