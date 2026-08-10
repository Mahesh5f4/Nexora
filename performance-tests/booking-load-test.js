import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 50 },  // Ramp up to 50 users
    { duration: '1m', target: 50 },   // Stay at 50 users
    { duration: '30s', target: 200 }, // Spike to 200 users
    { duration: '1m', target: 200 },  // Stay at 200 users
    { duration: '30s', target: 0 },   // Scale down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'], // 95% of requests must complete below 500ms, 99% below 1s
    http_req_failed: ['rate<0.01'], // less than 1% failure rate
  },
};

const BASE_URL = 'http://localhost:8080/api'; // API Gateway URL

export default function () {
  // 1. Event Discovery (Read-heavy)
  const eventsRes = http.get(`${BASE_URL}/events?page=0&size=20`);
  check(eventsRes, {
    'events fetched successfully': (r) => r.status === 200,
  });

  // Small delay to simulate user thinking time
  sleep(Math.random() * 2 + 1);

  // 2. Auth (Login) - Simulated, as creating 200 real users beforehand is needed.
  // We'll use a mocked internal endpoint or assume an existing test user
  const loginPayload = JSON.stringify({
    email: 'testuser@example.com',
    password: 'password123',
  });

  const loginRes = http.post(`${BASE_URL}/auth/login`, loginPayload, {
    headers: { 'Content-Type': 'application/json' },
  });

  let token = null;
  if (loginRes.status === 200) {
      token = loginRes.json('token');
  }

  // 3. Booking (Write-heavy)
  if (token) {
    const bookingPayload = JSON.stringify({
      eventId: 1,
      ticketCount: 2,
    });

    const bookRes = http.post(`${BASE_URL}/bookings`, bookingPayload, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
    });

    check(bookRes, {
      'booking successful or rate-limited/sold-out': (r) => [200, 201, 400, 429].includes(r.status), // Accept expected business failures under load
    });
  }

  sleep(Math.random() * 2 + 1);
}
