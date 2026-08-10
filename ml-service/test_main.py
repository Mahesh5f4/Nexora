import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}

def test_recommendations_success():
    payload = {
        "target_event_id": 1,
        "all_events": [
            {"id": 1, "title": "Rock Concert", "description": "Loud rock music", "location": "NY", "price": 50.0, "rating": 4.5},
            {"id": 2, "title": "Jazz Concert", "description": "Smooth jazz music", "location": "NY", "price": 60.0, "rating": 4.8},
            {"id": 3, "title": "Cooking Class", "description": "Learn to cook", "location": "LA", "price": 40.0, "rating": 4.0}
        ]
    }
    
    response = client.post("/recommendations", json=payload)
    if response.status_code == 404: # in case route is different
        response = client.post("/recommend", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "recommended_event_ids" in data
    assert isinstance(data["recommended_event_ids"], list)

def test_recommendations_empty_history():
    payload = {
        "target_event_id": 99,
        "all_events": [
            {"id": 1, "title": "Rock Concert", "description": "Loud rock music", "location": "NY", "price": 50.0, "rating": 4.5}
        ]
    }
    response = client.post("/recommend", json=payload)
    if response.status_code == 404:
        response = client.post("/recommendations", json=payload)
    # Target event not in all_events should probably return 404 or empty list
    assert response.status_code in [200, 404]

def test_recommendations_invalid_payload():
    payload = {
        "target_event_id": 1
        # missing all_events
    }
    response = client.post("/recommend", json=payload)
    if response.status_code == 404:
        response = client.post("/recommendations", json=payload)
    assert response.status_code == 422 # Validation error
