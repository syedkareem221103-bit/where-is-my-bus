# Capacity Planning Document

## 1. Current Capacity (V1.0 Launch Baseline)
- **Compute:** 2 vCPU, 4GB RAM (Node.js/Socket.IO)
- **Database:** 2 vCPU, 8GB RAM (PostgreSQL)
- **Expected Load:** 1,000 concurrent WebSockets, 100 GPS updates/sec.

## 2. Growth Thresholds
- **Trigger 1 (Moderate Load):** CPU sustained > 70% or RAM > 80% on compute node.
  *Action:* Scale compute to 4 vCPU, 8GB RAM.
- **Trigger 2 (High WebSocket Load):** Connections > 5,000.
  *Action:* Transition to multi-replica Node.js containers utilizing Redis Pub/Sub adapter for Socket.IO state sharing.
- **Trigger 3 (Database Bottleneck):** Active DB connections approaching 180 (Limit: 200).
  *Action:* Implement PgBouncer for advanced connection pooling.

## 3. Storage
- **Baseline:** 50GB SSD.
- **Growth:** Monitor Prometheus for disk usage. Scale block storage when > 70% utilized. Database scaling is linear; log files require aggressive log rotation.
