import requests
import concurrent.futures
import time
import json
import statistics

BASE_URL = "http://localhost:8080"
LOGIN_URL = f"{BASE_URL}/auth/login"
BOOKING_URL = f"{BASE_URL}/bookings"
STATUS_URL = f"{BASE_URL}/bookings/status"
EVENTS_URL = f"{BASE_URL}/events"

def login():
    payload = {"email": "admin@eventhub.com", "password": "admin123"}
    res = requests.post(LOGIN_URL, json=payload)
    data = res.json()
    # Check both wrapped and unwrapped formats
    return data.get("token") or data.get("data", {}).get("token")

def get_event(token):
    headers = {"Authorization": f"Bearer {token}"}
    res = requests.get(EVENTS_URL, headers=headers)
    return res.json().get("data", {}).get("content")[0]

def poll_status(token, correlation_id):
    headers = {"Authorization": f"Bearer {token}"}
    start = time.time()
    while time.time() - start < 15: # Timeout after 15s
        res = requests.get(f"{STATUS_URL}/{correlation_id}", headers=headers)
        if res.status_code == 200:
            data = res.json().get("data", {})
            if data.get("status") in ["COMPLETED", "FAILED"]:
                return data.get("status"), time.time() - start
        time.sleep(0.5)
    return "TIMEOUT", 15

def book_and_poll(token, event_id):
    headers = {"Authorization": f"Bearer {token}"}
    payload = {"eventId": event_id, "ticketCount": 1}
    
    start_req = time.time()
    try:
        res = requests.post(BOOKING_URL, json=payload, headers=headers)
        req_latency = time.time() - start_req
        
        if res.status_code == 202:
            correlation_id = res.json().get("data", {}).get("bookingId")
            final_status, async_latency = poll_status(token, correlation_id)
            return True, req_latency, async_latency, final_status
        print(f"Submission failed: {res.status_code} - {res.text}")
        return False, req_latency, 0, f"Error: {res.status_code}"
    except Exception as e:
        return False, 0, 0, str(e)

def run_stress_test(num_users=100):
    token = login()
    event = get_event(token)
    event_id = event["id"]
    initial_seats = event["availableSeats"]

    print(f"Starting Stress Test: {num_users} users")
    print(f"Event: {event['title']} (ID: {event_id})")
    print(f"Initial Seats: {initial_seats}")

    results = []
    start_total = time.time()

    with concurrent.futures.ThreadPoolExecutor(max_workers=50) as executor:
        futures = [executor.submit(book_and_poll, token, event_id) for _ in range(num_users)]
        for f in concurrent.futures.as_completed(futures):
            results.append(f.result())

    end_total = time.time()
    
    # Analysis
    success_requests = [r for r in results if r[0]]
    completed_bookings = [r for r in results if r[3] == "COMPLETED"]
    failed_bookings = [r for r in results if r[3] == "FAILED"]
    
    req_latencies = [r[1] for r in results]
    async_latencies = [r[2] for r in success_requests]

    print("\n--- Performance Results ---")
    print(f"Total Duration: {end_total - start_total:.2f}s")
    print(f"Successful Submissions: {len(success_requests)}/{num_users}")
    print(f"Completed Bookings: {len(completed_bookings)}")
    print(f"Failed (Business Logic): {len(failed_bookings)}")
    print(f"Throughput: {len(success_requests) / (end_total - start_total):.2f} req/s")
    
    if req_latencies:
        print(f"Avg Request Latency: {statistics.mean(req_latencies)*1000:.2f}ms")
    if async_latencies:
        print(f"Avg Async Processing Time: {statistics.mean(async_latencies):.2f}s")

    final_event = get_event(token)
    print(f"\nFinal Seats: {final_event['availableSeats']}")
    
    if final_event['availableSeats'] >= 0:
        print("SUCCESS: Data integrity maintained.")
    else:
        print("CRITICAL: Overbooking detected!")

if __name__ == "__main__":
    run_stress_test(150) # Simulate 150 requests
