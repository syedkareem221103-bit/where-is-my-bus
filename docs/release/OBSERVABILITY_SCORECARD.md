# Observability Scorecard

This scorecard grades the overall visibility of the production system to ensure no blind spots exist post-launch.

## 1. Log Coverage (Weight: 30%)
- **Target:** All HTTP 4xx and 5xx errors are logged in JSON format via Winston.
- **Target:** Correlation IDs (`x-request-id`) are present in 100% of logs traversing the Nginx -> Node.js boundary.
- **Status:** **PASSED (30/30)**

## 2. Metric Cardinality (Weight: 40%)
- **Target:** Prometheus successfully scrapes `/metrics` exposing:
  - Active WebSocket Connections
  - BullMQ Queue Depths
  - HTTP Request Latency Histograms
  - PostgreSQL Active Connections
- **Status:** **PASSED (40/40)**

## 3. Distributed Tracing (Weight: 10%)
- **Target:** Application Insights / OpenTelemetry spans cover Database queries.
- **Status:** **PASSED (10/10)**

## 4. Alert Routing (Weight: 20%)
- **Target:** Critical alerts (CPU > 85%, Error Rate > 1%) are actively routed to PagerDuty/Slack via Alertmanager.
- **Status:** **PASSED (20/20)**

### Final Observability Score: 100/100
