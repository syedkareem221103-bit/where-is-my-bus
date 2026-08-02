# Scaling Strategy

## 1. Vertical Scaling (Immediate Mitigation)
If the application hits a bottleneck, the fastest resolution is vertical scaling:
1. Increase instance size on AWS/DigitalOcean.
2. Increase Node.js heap limit (`--max-old-space-size=4096`).
3. Increase Nginx `worker_connections` to 20,000.

## 2. Horizontal Scaling (Long-Term Architecture)
To scale beyond a single compute node:
1. **Stateless Backend:** Ensure JWTs handle all auth state. No in-memory sessions.
2. **Socket.IO:** Activate the Redis adapter within the codebase to allow multi-node WebSocket broadcasting.
3. **Load Balancer:** Shift SSL termination to an external Load Balancer (e.g., AWS ALB), proxying traffic to multiple EC2/Droplet instances running Docker.

## 3. Database Scaling
1. Offload heavy analytic queries to a Read-Replica.
2. Retain the primary node strictly for INSERT/UPDATE transactions (GPS streams, attendance).
