# Production Runbooks: Rollback & Disaster Recovery

## 1. Application Rollback Protocol
If the V1.0 deployment exhibits catastrophic failure in production (e.g., Crash loop, 100% API failure):

**Trigger Condition:** P0 Incident identified within 30 minutes of deployment.
**Approval:** DevOps Lead or Engineering VP.
**Action:**
1. Stop the current CI/CD pipeline if still running.
2. Manually deploy the previous stable Docker image tag (e.g., `v0.9.9`).
3. If using Docker Compose:
   ```bash
   export IMAGE_TAG=v0.9.9
   docker-compose -f docker-compose.prod.yml up -d
   ```
4. Verify system health at `/health`.

## 2. Database Rollback Protocol (No Schema Changes in V1.0)
Since V1.0 involves ZERO schema changes from the RC phase, a strict database rollback via `prisma migrate resolve --rolled-back` is **not required**.
However, in the event of catastrophic data corruption:
1. Identify the manual RDS snapshot taken immediately prior to deployment.
2. Execute an AWS RDS Restore to a Point-in-Time or restore from the Snapshot.
3. Update connection strings if the restored DB instance URL changes.

## 3. Disaster Recovery (DR) Plan
**Scenario:** Primary AWS Availability Zone Failure (Hard crash).
**RTO (Recovery Time Objective):** < 1 Hour
**RPO (Recovery Point Objective):** < 24 Hours (based on midnight backups)

**Action Plan:**
1. Provision secondary infrastructure using Terraform/CloudFormation scripts.
2. Restore the latest encrypted `pg_dump` backup into the new PostgreSQL instance:
   ```bash
   pg_restore -d postgresql://user:pass@new-host:5432/wimb_prod latest_backup.dump
   ```
3. Update DNS (Route53/Cloudflare) to point to the new Load Balancer IP.
4. Scale up the Docker containers.
5. Notify stakeholders via StatusPage.
