# Operations Manual

## 1. Routine Operations
- **Log Aggregation:** View combined logs with `docker-compose -f docker-compose.prod.yml logs -f --tail=100`
- **Component Restart:** If a component fails to respond to health checks, restart it individually:
  `docker-compose -f docker-compose.prod.yml restart backend`
- **Database Shell Access:** `docker exec -it where-is-my-bus_db_1 psql -U wimb_prod_user -d wimb_prod`

## 2. Certificates & SSL
- Let's Encrypt certificates automatically renew. If utilizing custom certs, place them in `/ssl/` and restart Nginx:
  `docker-compose -f docker-compose.prod.yml restart nginx`

## 3. Scaling
- To scale the Node.js backend horizontally (assuming you configure load balancing in `docker-compose.prod.yml`):
  `docker-compose -f docker-compose.prod.yml up -d --scale backend=3`

## 4. Updates
- Always use the `scripts/deploy.sh` for minor tag updates. Run `scripts/verify.sh` immediately after.
