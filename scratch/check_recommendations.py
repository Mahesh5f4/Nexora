import requests
import json

BASE_URL = "http://localhost:8080"

def check_recommendations(event_id):
    print(f"Fetching recommendations for event ID: {event_id}...")
    resp = requests.get(f"{BASE_URL}/events/{event_id}/recommendations")
    
    if resp.status_code == 200:
        data = resp.json()['data']
        print(f"Found {len(data)} recommendations:")
        for rec in data:
            print(f"- ID: {rec['id']}, Title: {rec['title']}")
    else:
        print(f"Failed to fetch recommendations: {resp.text}")

if __name__ == "__main__":
    check_recommendations(2)
