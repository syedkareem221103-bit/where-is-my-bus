# Network Topology

## External Network (Internet)
- **Ports:** 80 (HTTP, redirected to HTTPS), 443 (HTTPS)
- **Ingress:** Handled by Nginx reverse proxy. All SSL termination happens here.

## Docker Bridge Network: `frontend-network`
- Connects: Nginx Container -> Node.js Backend Container
- Purpose: Allows the edge proxy to communicate with the Node.js API and Socket.IO endpoints.

## Docker Bridge Network: `backend-network`
- Connects: Node.js Backend -> PostgreSQL & Redis & Prometheus/Grafana
- Purpose: Strictly isolated from the public internet and the frontend proxy. The databases can only be queried by the backend container.

## Port Mappings
- **Nginx:** 80:80, 443:443
- **Grafana:** 3001:3000 (Protected by auth)
- **PostgreSQL/Redis:** Not mapped to host ports to prevent external brute force attacks.
