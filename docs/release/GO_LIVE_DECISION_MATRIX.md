# Go-Live Decision Matrix

This matrix establishes the definitive criteria used by the Executive Board to formally declare "Where Is My Bus" V1.0 ready for public traffic.

## 1. Hard Constraints (No-Go Triggers)
If any of the following conditions are met during the Hypercare or pre-launch window, Go-Live is **immediately aborted**.
- **Security:** Critical/High CVE discovered in production containers.
- **Data Integrity:** Any instance of cross-tenant data bleed.
- **Availability:** Core API TTFB > 500ms or HTTP 5xx Error Rate > 1%.
- **WebSockets:** Connection drop rate exceeds 5% of active sessions.
- **Compliance:** Failure to mask PII (Personally Identifiable Information) in logs.

## 2. Risk Assessment & Mitigation
| Identified Risk | Impact | Likelihood | Mitigation Strategy |
| :--- | :--- | :--- | :--- |
| Mapbox API Outage | High | Low | Implement client-side caching of route geometry. |
| Redis OOM (Out of Memory) | Critical | Medium | Aggressive eviction policies; configure memory alerts at 75%. |
| GPS Spikes | Medium | High | Implement Kalman filtering on the backend to smooth anomalies. |

## 3. Rollback Decision Matrix
Post-launch, if a P0 Incident occurs within the first 2 hours:
- **Condition:** Database schema corruption detected.
- **Action:** Immediately execute `./scripts/db-rollback.sh` and revert Nginx traffic to maintenance page.
- **Condition:** UI Bug preventing Login.
- **Action:** Rollback Docker Image tag via `./scripts/rollback.sh`, avoiding database resets.

## 4. Error Budget
- SLA Target: **99.9% Uptime**.
- Acceptable Downtime (Error Budget): **43 minutes, 49 seconds per month**.
- If the Error Budget burn rate exceeds 50% in the first 24 hours of Go-Live, a feature freeze is automatically enacted for the subsequent Sprint.
