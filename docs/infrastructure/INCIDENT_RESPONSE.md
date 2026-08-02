# Production Incident Response Guide

## 1. Triage & Severity
- **P0 (Critical):** Complete system outage, database corruption, or data breach. (Response Time: < 15 mins)
- **P1 (High):** Significant performance degradation or core feature failure (e.g., GPS tracking down). (Response Time: < 1 hr)
- **P2 (Medium):** Minor bug affecting small subset of users. (Response Time: Next business day)

## 2. P0 Resolution Protocol
1. **Acknowledge:** On-call engineer claims the PagerDuty alert.
2. **Contain:** If a breach is suspected, isolate the environment (modify UFW/Security Groups). If a bad deployment, immediately run `./scripts/rollback.sh <stable_tag>`.
3. **Communicate:** Notify stakeholders via dedicated Slack channel (`#incident-p0-prod`). Update the external status page.
4. **Resolve:** Execute Disaster Recovery (e.g. `./restore.sh`) if database corruption is detected.
5. **Post-Mortem:** Document root cause within 48 hours. Generate RCA (Root Cause Analysis).
