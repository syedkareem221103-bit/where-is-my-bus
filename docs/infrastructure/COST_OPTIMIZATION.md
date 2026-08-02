# Cost Optimization Recommendations

## 1. Compute Savings
- **Right-Sizing:** Monitor CPU/RAM for 14 days post-launch. If average utilization < 20%, downgrade instance size.
- **Reserved Instances:** Once the baseline compute requirements are proven stable (approx. month 3), transition from On-Demand to 1-year or 3-year Reserved Instances (AWS) or Droplet Reserved Billing (DigitalOcean) for up to 40% savings.

## 2. Bandwidth & CDN
- **Cloudflare Caching:** Aggressively cache static assets (Vite frontend, images) at the Cloudflare edge to minimize egress bandwidth costs from the origin server.
- **WebSocket Tuning:** Optimize payload sizes for GPS updates (e.g., using Protobufs instead of JSON if bandwidth becomes an issue at scale) to reduce data transfer.

## 3. Storage
- **Log Retention:** Push historical logs to cold storage (e.g., AWS S3 Glacier) after 30 days instead of keeping them on expensive NVMe block storage.
- **Database Backups:** Configure S3 Lifecycle policies to transition `pg_dump` files to Glacier after 7 days, and delete them after 90 days.
