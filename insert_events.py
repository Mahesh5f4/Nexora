import requests
import json
import random
import datetime

# Configuration
BASE_URL = "http://localhost:8080/api"
ADMIN_EMAIL = "admin@eventhub.com"
ADMIN_PASSWORD = "admin123"

def get_admin_token():
    print("Logging in as Admin...")
    response = requests.post(f"{BASE_URL}/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    
    if response.status_code == 200:
        data = response.json()
        if data.get("requires2FA"):
            print("2FA required for admin? This shouldn't happen.")
            return None
        return data.get("token")
    else:
        print(f"Login failed: {response.text}")
        return None

def create_event(token, event_data):
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    response = requests.post(f"{BASE_URL}/events", json=event_data, headers=headers)
    if response.status_code == 200:
        print(f"Created event: {event_data['title']}")
        return True
    else:
        print(f"Failed to create event {event_data['title']}: {response.text}")
        return False

def generate_events():
    now = datetime.datetime.now()
    events = []
    
    # 5 highly similar events for recommendation testing (e.g. AI/ML workshops in Bangalore)
    similar_events = [
        {
            "title": "Machine Learning Fundamentals",
            "description": "An introductory workshop on Machine Learning, Neural Networks, and Data Science. Perfect for beginners looking to enter the AI field.",
            "location": "Bengaluru Convention Centre, Bangalore",
            "price": 1500.0,
            "totalSeats": 100,
            "imageUrl": "https://images.unsplash.com/photo-1555949963-aa79dcee981c?auto=format&fit=crop&q=80&w=1000",
            "category": "Technology"
        },
        {
            "title": "Advanced Deep Learning Bootcamp",
            "description": "Dive deep into Deep Learning, PyTorch, and TensorFlow. This workshop covers advanced AI and Neural Networks concepts.",
            "location": "Tech Hub, Bangalore",
            "price": 2500.0,
            "totalSeats": 50,
            "imageUrl": "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&q=80&w=1000",
            "category": "Technology"
        },
        {
            "title": "Applied AI for Business",
            "description": "Learn how to apply Artificial Intelligence and Machine Learning models to solve real-world business problems.",
            "location": "Innovation Park, Bangalore",
            "price": 2000.0,
            "totalSeats": 150,
            "imageUrl": "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&q=80&w=1000",
            "category": "Technology"
        },
        {
            "title": "Natural Language Processing Masterclass",
            "description": "Master NLP techniques, Transformers, and LLMs in this comprehensive Artificial Intelligence and Machine Learning masterclass.",
            "location": "Bengaluru Convention Centre, Bangalore",
            "price": 3000.0,
            "totalSeats": 75,
            "imageUrl": "https://images.unsplash.com/photo-1593508512255-86ab42a8e620?auto=format&fit=crop&q=80&w=1000",
            "category": "Technology"
        },
        {
            "title": "Computer Vision & AI Summit",
            "description": "A premier summit focusing on Computer Vision, AI, and Machine Learning applications in modern industry.",
            "location": "Tech Hub, Bangalore",
            "price": 1000.0,
            "totalSeats": 200,
            "imageUrl": "https://images.unsplash.com/photo-1527430253228-e93688616381?auto=format&fit=crop&q=80&w=1000",
            "category": "Technology"
        }
    ]
    
    for idx, e in enumerate(similar_events):
        # Schedule them for next month
        start_time = now + datetime.timedelta(days=30 + idx)
        end_time = start_time + datetime.timedelta(hours=8)
        
        e["startTime"] = start_time.strftime("%Y-%m-%dT%H:%M:%S")
        e["endTime"] = end_time.strftime("%Y-%m-%dT%H:%M:%S")
        events.append(e)

    # 45 random other events
    categories = ["Music", "Sports", "Arts", "Food", "Business", "Health", "Education"]
    cities = ["Mumbai", "Delhi", "Pune", "Hyderabad", "Chennai", "Kolkata"]
    adjectives = ["Annual", "Global", "National", "Premium", "Exclusive", "Community", "Virtual", "Interactive"]
    nouns = ["Festival", "Conference", "Meetup", "Exhibition", "Symposium", "Workshop", "Gala", "Tournament"]
    
    for i in range(45):
        category = random.choice(categories)
        city = random.choice(cities)
        title = f"{random.choice(adjectives)} {category} {random.choice(nouns)} {2026}"
        
        start_time = now + datetime.timedelta(days=random.randint(5, 180))
        end_time = start_time + datetime.timedelta(hours=random.randint(2, 48))
        
        events.append({
            "title": title,
            "description": f"Join us for the {title}. This is going to be an amazing event covering various aspects of {category}.",
            "location": f"Main Arena, {city}",
            "startTime": start_time.strftime("%Y-%m-%dT%H:%M:%S"),
            "endTime": end_time.strftime("%Y-%m-%dT%H:%M:%S"),
            "price": round(random.uniform(100.0, 5000.0), 2),
            "totalSeats": random.randint(50, 1000),
            "imageUrl": "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&q=80&w=1000",
            "category": category
        })
        
    return events

if __name__ == "__main__":
    token = get_admin_token()
    if token:
        events = generate_events()
        for i, ev in enumerate(events):
            print(f"[{i+1}/50] ", end="")
            create_event(token, ev)
    else:
        print("Could not obtain admin token. Exiting.")
