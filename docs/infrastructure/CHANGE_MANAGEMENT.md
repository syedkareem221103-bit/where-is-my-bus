# Production Change Management

## 1. Change Advisory Board (CAB)
All deployments to the production environment must pass through CAB approval.
- **Jira / ServiceNow Ticket:** Must include a detailed Rollback Plan and Testing Matrix.
- **Approval Window:** CAB meets every Tuesday and Thursday at 14:00.

## 2. GitHub Actions Approval Workflow
- The `deploy-production.yml` pipeline utilizes GitHub Environments.
- When the `deploy_production` job initiates, it pauses execution and sends a notification.
- A designated Engineering Manager or Lead SRE must manually click "Approve" within the GitHub UI before the SSH deployment sequence will execute.

## 3. Release Communication Plan
- **Pre-deployment:** An automated Slack message to `#announcements` at T-30 minutes.
- **Post-deployment:** An automated Slack webhook confirming success (or failure) including MTTR tracking.

## 4. Hypercare Support
- Following any Major (V1.0) deployment, a 14-day Hypercare window is activated.
- All P1 bugs discovered in production supersede Sprint feature work.
- The SRE team maintains active observation on Grafana dashboards for 60 minutes post-deployment to ensure the SLA (>99.9%) is sustained.
