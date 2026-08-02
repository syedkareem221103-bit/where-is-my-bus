# Synthetic Monitoring Plan

To ensure proactive incident discovery, synthetic monitoring scripts are deployed to run continuously against the live production environment.

## 1. Core Workflows Monitored
The following Playwright/Cron scripts execute every 5 minutes from an external network (e.g., AWS Lambda or DataDog):

### A. The Parent Login Flow
- **Action:** Navigates to `app.whereismybus.com/login`, inputs synthetic credentials, and verifies the dashboard loads.
- **Assertion:** Ensures the HTTP response is 200 and the DOM element `#map-container` is visible within 3 seconds.

### B. The API Health Check
- **Action:** Executes `GET /api/v1/health`.
- **Assertion:** Validates the response JSON contains `"status": "ok"` and `"db": "connected"`.

### C. The WebSocket Handshake
- **Action:** Attempts an upgrade request to `wss://app.whereismybus.com/socket.io/`.
- **Assertion:** Validates the `101 Switching Protocols` response is received and the connection remains stable for 5 seconds before disconnecting.

## 2. Alerting Integration
If any synthetic script fails twice consecutively (over a 10-minute window), a P1 Incident is automatically generated in PagerDuty, alerting the on-call SRE.
