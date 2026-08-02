# Advanced Deployment Strategies

## 1. Blue-Green Deployment
To achieve zero-downtime, the infrastructure supports Blue-Green deployments:
- **Architecture:** Two identical environments (Blue and Green) running simultaneously.
- **Workflow:**
  1. Current production traffic flows exclusively to Blue (`backend-blue`).
  2. The pipeline deploys the new V1.0 container to Green (`backend-green`).
  3. Pre-flight health checks (`/health`) run internally against Green.
  4. Nginx `upstream` block is reloaded (without dropping connections) to route incoming traffic to Green.
  5. Blue is retained for 24 hours as an immediate rollback target.

## 2. Canary Deployment Strategy
For high-risk UI or logic changes, traffic is diverted progressively:
- **Workflow:**
  1. Deploy new image to a dedicated `backend-canary` node.
  2. Update Nginx with a `split_clients` configuration to route 5% of requests to the canary node.
  3. Monitor HTTP 5xx rates in Grafana for 1 hour.
  4. If error rate < 0.1%, escalate to 100% traffic.

## 3. Feature Flagging
The codebase supports in-memory feature toggling:
- **Mechanism:** Critical features (e.g., a new real-time algorithm) are wrapped in logic that checks Redis.
- **Advantage:** Enables turning off a failing feature instantly via Redis CLI without needing to rollback the Docker container.
