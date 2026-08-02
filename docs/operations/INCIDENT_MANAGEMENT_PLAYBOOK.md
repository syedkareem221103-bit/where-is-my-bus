# Incident Management & Support Playbook

## 1. L1 / L2 / L3 Support Boundaries
- **L1 (Helpdesk / Frontline):** Initial triage of Zendesk tickets. Responsible for password resets, user education, and basic account provisioning. Cannot access production infrastructure.
- **L2 (Operations / On-Call):** Responsible for acknowledging PagerDuty alerts, executing predefined Runbooks, and parsing CloudWatch logs. Authorized to restart Docker containers.
- **L3 (Engineering / SRE):** Escalation point for P0/P1 incidents. Authorized to patch source code, execute database migrations, and modify infrastructure configurations.

## 2. Hypercare Procedures
For 14 days post V1.0 Go-Live:
- **Mandatory Syncs:** 09:00 AM daily sync between L2, L3, and the Product Owner to review all tickets from the previous 24 hours.
- **Expedited Resolution:** All P2 incidents during Hypercare are treated with P1 SLAs (1-hour resolution target).
- **Exit Criteria:** 14 consecutive days without a P0 incident.

## 3. Escalation Matrix
| Unacknowledged Duration | Escalation Action |
| :--- | :--- |
| **0 Minutes** | Primary On-Call (L2) paged. |
| **15 Minutes** | Secondary On-Call (L2) paged. |
| **30 Minutes** | L3 Engineering Lead paged. |
| **60 Minutes** | CTO and Operations Director notified via SMS. |

## 4. Production Support Runbooks
### 4.1 Redis OOM (Out of Memory)
- **Symptom:** BullMQ jobs stalling; `OOM command not allowed` in logs.
- **Action:** Exec into the Redis container and run `MEMORY PURGE`. If recurring, increase `maxmemory` limit in `docker-compose.yml` by 256MB.
### 4.2 GPS Tracking Stalled
- **Symptom:** Parents report buses frozen on the map.
- **Action:** Verify Mapbox API quota limit. Check Socket.IO room subscriptions via Grafana dashboard.

## 5. Root Cause Analysis (RCA) & Post-Incident Review (PIR)
### 5.1 RCA Template (The "5 Whys")
1. **Why did the system fail?** (e.g., Database locked up).
2. **Why?** (e.g., A massive unindexed query was executed).
3. **Why?** (e.g., The V1.0 launch missed a specific Prisma index).
4. **Why?** (e.g., Load testing didn't cover the Driver Assignment endpoint).
5. **Why?** (e.g., QA lacked a sufficiently large mock dataset).

### 5.2 PIR Template
- **Date of Incident:**
- **Incident Commander:**
- **Impact Summary:** (e.g., 5,000 Parents unable to view maps for 22 minutes).
- **Timeline of Events:**
- **Root Cause (RCA):**
- **Action Items (Jira Tickets):** (e.g., Add Index to DB, Update Load Testing Suite).
