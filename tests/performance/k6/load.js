import http from 'k6/http';
import ws from 'k6/ws';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metric to track error rate
export let errorRate = new Rate('errors');

// Configuration mimicking the Performance Acceptance Matrix
export const options = {
  stages: [
    { duration: '30s', target: 100 },  // Ramp up to 100 users
    { duration: '1m', target: 500 },   // Ramp up to 500 users
    { duration: '30s', target: 1000 }, // Spike to 1,000 users
    { duration: '30s', target: 0 },    // Ramp down to 0
  ],
  thresholds: {
    'http_req_duration': ['p(95)<300', 'p(99)<500'],
    'errors': ['rate<0.001'], // < 0.1% errors
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:4000';

export default function () {
  const payload = JSON.stringify({
    email: 'parent@e2e.com',
    password: 'password123',
  });

  const headers = { 'Content-Type': 'application/json' };

  // 1. Benchmark REST API (Authentication)
  const loginRes = http.post(`${BASE_URL}/api/v1/auth/login`, payload, { headers });
  
  const loginSuccess = check(loginRes, {
    'login is 200': (r) => r.status === 200,
    'has token': (r) => r.json('token') !== undefined,
  });
  
  errorRate.add(!loginSuccess);

  // 2. Benchmark Websocket (if login successful)
  if (loginSuccess) {
    const token = loginRes.json('token');
    
    // Connect to Socket.IO. We assume standard socket.io transport over ws
    const wsUrl = `ws://${BASE_URL.replace('http://', '')}/socket.io/?EIO=4&transport=websocket&token=${token}`;
    
    const wsRes = ws.connect(wsUrl, function (socket) {
      socket.on('open', () => {
        // Send a ping/join room event
        socket.send('42["join_route", "test-route-id"]');
      });

      socket.on('message', (msg) => {
        // Verify real-time updates are received
        if (msg.includes('location_update')) {
           check(msg, { 'received location': (m) => m !== '' });
        }
      });

      // Close after 10 seconds of listening
      socket.setTimeout(function () {
        socket.close();
      }, 10000);
    });
    
    check(wsRes, { 'websocket connected successfully': (r) => r && r.status === 101 });
  }

  // Sleep to simulate real user pacing
  sleep(1);
}
