# Incident Severity Matrix

This matrix governs the SLA and escalation policies for production anomalies during the Hypercare support window and beyond.

| Severity | Definition | Owner | SLA (Response) | SLA (Resolution) |
| :--- | :--- | :--- | :--- | :--- |
| **P0 (Critical)** | Complete system outage, massive data breach, or catastrophic DB corruption. | Incident Commander | Immediate | 15 Minutes |
| **P1 (High)** | Major feature is broken (e.g., GPS tracking down for all users, Authentication failing). | On-Call Engineer | 15 Minutes | 1 Hour |
| **P2 (Medium)** | Minor feature bug, localized data delay, or UI glitch not impacting the core workflow. | Product Team | Next Business Day | Next Sprint |
| **P3 (Low)** | Cosmetic issue, minor typo, or non-critical Prometheus alert. | Backlog / DevOps | N/A | Prioritized via Backlog |
