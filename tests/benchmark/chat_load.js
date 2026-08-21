import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

// Metrics
const successfulRequests = new Counter('successful_requests');
const failedRequests = new Counter('failed_requests');
const http2xx = new Rate('http_2xx');
const http4xx = new Rate('http_4xx');
const http429 = new Rate('http_429');
const http5xx = new Rate('http_5xx');
const latencyTrend = new Trend('request_latency');

export const options = {
  stages: [
    { duration: '30s', target: __ENV.VUS || 10 },
    { duration: '30s', target: __ENV.VUS || 10 },
    { duration: '10s', target: 0 },
  ],
  thresholds: {
    http_2xx: ['rate>0.9'],
    request_latency: ['p(95)<5000'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost/api';
const EMAIL = __ENV.EMAIL || 'test_bench@example.com';
const PASSWORD = __ENV.PASSWORD || 'password123';

// 1. Setup Phase: Register/Login and Create Conversation
export function setup() {
  const registerRes = http.post(`${BASE_URL}/auth/register`, JSON.stringify({
    name: 'Benchmarker',
    email: EMAIL,
    password: PASSWORD,
    role: 'USER'
  }), { headers: { 'Content-Type': 'application/json' } });
  
  const loginRes = http.post(`${BASE_URL}/auth/login`, JSON.stringify({
    email: EMAIL,
    password: PASSWORD
  }), { headers: { 'Content-Type': 'application/json' } });
  
  let token = null;
  if (loginRes.status === 200) {
    token = loginRes.json('token');
  } else {
    console.error("Login failed", loginRes.body);
  }

  // Create a conversation
  const convRes = http.post(`${BASE_URL}/ai/conversations`, JSON.stringify({
    role: 'general'
  }), { headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` } });
  
  let convId = null;
  if (convRes.status === 200 || convRes.status === 201) {
      convId = convRes.json('id');
  } else {
      console.error("Conv failed", convRes.body);
  }

  return { token: token, convId: convId };
}

// 2. VU Code: Send messages to the stream
export default function (data) {
  if (!data.token || !data.convId) {
    return;
  }

  const payload = JSON.stringify({
    content: 'What is the capital of France? Reply in exactly one word.',
    mode: 'general',
    stream: true
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${data.token}`,
      'Accept': 'text/event-stream'
    },
    timeout: '30000', // 30s timeout
  };

  const start = new Date();
  const res = http.post(`${BASE_URL}/ai/conversations/${data.convId}/messages/stream`, payload, params);
  const end = new Date();
  
  const latency = end - start;
  latencyTrend.add(latency);

  if (res.status === 200) {
    successfulRequests.add(1);
    http2xx.add(1);
  } else {
    failedRequests.add(1);
    http2xx.add(0);
    if (res.status >= 400 && res.status < 500) {
      http4xx.add(1);
      if (res.status === 429) http429.add(1);
    }
    if (res.status >= 500) http5xx.add(1);
  }

  check(res, {
    'status is 200': (r) => r.status === 200,
    'stream is valid': (r) => r.body.includes('event:') || r.body.includes('data:'),
  });

  sleep(1);
}
