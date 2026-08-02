# Post Deployment Verification Matrix

Immediately following traffic cutover to the new V1.0 deployment, the SRE and QA teams must execute this formal verification matrix before declaring the maintenance window closed.

## 1. Application Layer (QA Team)
- [ ] **Authentication:** Successfully log in as a Parent, Driver, and Admin.
- [ ] **RBAC:** Verify Admin dashboard is inaccessible to Driver tokens.
- [ ] **Real-time Map:** Verify the React UI renders Mapbox tiles without CORS or CSP console errors.
- [ ] **Notifications:** Trigger a manual SMS/Push and verify receipt on a physical test device.

## 2. Infrastructure Layer (SRE Team)
- [ ] **Grafana Dashboard:** Verify CPU usage remains < 20% post-startup spike.
- [ ] **Prometheus Exporter:** Verify `nodejs_backend` target is actively returning metrics.
- [ ] **Log Ingestion:** Verify Winston logs are flowing into the central log aggregator without buffering delays.
- [ ] **Error Rate:** Ensure HTTP 5xx error rate is strictly < 0.1% over a 15-minute rolling window.
- [ ] **WebSockets:** Verify Nginx is sustaining `101 Switching Protocols` without premature timeouts.

## 3. Database Layer (DBA Team)
- [ ] **Connection Pool:** Verify active connections are stable (e.g., < 50) and not leaking.
- [ ] **Deadlocks:** Check PostgreSQL logs for any transaction deadlocks caused by the new migration.
- [ ] **Cache Hit Ratio:** Verify Redis is actively serving session/eta data, reducing DB load.

## 4. Security Layer (SecOps Team)
- [ ] **SSL Chain:** Run `ssllabs-scan` against the domain to verify an A+ rating remains intact.
- [ ] **Firewall Validation:** Ensure internal Docker bridge networks haven't accidentally mapped DB ports to `0.0.0.0`.
