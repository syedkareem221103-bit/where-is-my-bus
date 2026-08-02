# Reliability Governance & SLAs

## 1. Operational SLAs & SLOs
- **SLA (External Commitment):** 99.9% Uptime (Maximum 43.8 minutes downtime/month).
- **SLO (Internal Objective):** 99.95% Uptime (Maximum 21.9 minutes downtime/month).
- **API Latency SLO:** 95th percentile (p95) TTFB < 200ms.
- **WebSocket SLO:** Handshake success rate > 99%.

## 2. Error Budget Governance
- **Budget Allocation:** 43 minutes per month.
- **Burn Rate Action:** If 50% of the budget is consumed in a single week, a **Change Freeze** is enacted. All L3 Engineering shifts focus from feature development (V1.1) to reliability debt.

## 3. Operational KPI Dashboard
The Grafana Master KPI Dashboard must track:
- **MTTA (Mean Time to Acknowledge):** Target < 15 minutes.
- **MTTR (Mean Time to Resolve):** Target < 1 hour.
- **MTBF (Mean Time Between Failures):** Target > 30 days.

## 4. Capacity & Cost Monitoring
- **RAM Thresholds:** Node.js V8 heap > 75% triggers an auto-scaling alert.
- **Cost Anomalies:** AWS billing alerts trigger if daily spend exceeds $50.00 above the trailing 7-day average.

## 5. Operational Ownership
- **Feature Code:** Owned by the Product Development Squad.
- **Infrastructure & DB:** Owned by Site Reliability Engineering (SRE).
- **Security Posture:** Owned by the SecOps Lead.
