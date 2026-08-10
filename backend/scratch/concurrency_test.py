import requests
import concurrent.futures
import time
import json

BASE_URL = "http://localhost:8080"
LOGIN_URL = f"{BASE_URL}/auth/login"
BOOKING_URL = f"{BASE_URL}/bookings"
EVENTS_URL = f"{BASE_URL}/events"

# Login to get JWT
def login():
    payload = {
        "email": "admin@eventhub.com",
        "password": "admin123"
    }
    response = requests.post(LOGIN_URL, json=payload)
    if response.status_code == 200:
        data = response.json()
        # Handle cases where response might be wrapped in ApiResponse or not
        return data.get("token") or data.get("data", {}).get("token")
    else:
        print(f"Login failed: {response.text}")
        return None

def get_event(token):
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(EVENTS_URL, headers=headers)
    if response.status_code == 200:
        data = response.json()
        # Handle ApiResponse wrapper
        content = data.get("data", {}).get("content") or data.get("content")
        if content:
            return content[0]
    return None

def book_ticket(token, event_id):
    headers = {"Authorization": f"Bearer {token}"}
    payload = {
        "eventId": event_id,
        "ticketCount": 1
    }
    try:
        response = requests.post(BOOKING_URL, json=payload, headers=headers, timeout=10)
        return response.status_code, response.json()
    except Exception as e:
        return 500, str(e)

def run_concurrency_test():
    token = login()
    if not token:
        return

    event = get_event(token)
    if not event:
        print("No events found to test.")
        return

    event_id = event["id"]
    initial_seats = event["availableSeats"]
    
    print(f"Testing Event ID: {event_id}")
    print(f"Initial Seats: {initial_seats}")
    
    # We will simulate more users than available seats
    num_requests = initial_seats + 20
    print(f"Starting {num_requests} concurrent booking requests...")

    results = []
    start_time = time.time()
    
    with concurrent.futures.ThreadPoolExecutor(max_workers=50) as executor:
        future_to_booking = {executor.submit(book_ticket, token, event_id): i for i in range(num_requests)}
        for future in concurrent.futures.as_completed(future_to_booking):
            results.append(future.result())

    end_time = time.time()
    
    # Analyze results
    success_count = sum(1 for status, body in results if status == 200)
    failure_count = sum(1 for status, body in results if status != 200)
    
    # Verify final seat count
    final_event = get_event(token)
    final_seats = final_event["availableSeats"]
    
    print("\n--- Concurrency Test Results ---")
    print(f"Total Requests: {num_requests}")
    print(f"Successful Bookings: {success_count}")
    print(f"Failed Bookings: {failure_count}")
    print(f"Initial Seats: {initial_seats}")
    print(f"Final Seats: {final_seats}")
    print(f"Expected Final Seats: {max(0, initial_seats - success_count)}")
    print(f"Time Taken: {end_time - start_time:.2f} seconds")
    
    if final_seats >= 0 and (initial_seats - success_count) == final_seats:
        print("\nSUCCESS: No over-booking occurred. The system correctly handled concurrency.")
    else:
        print("\nFAILURE: Over-booking detected or seat count mismatch!")

if __name__ == "__main__":
    run_concurrency_test()
