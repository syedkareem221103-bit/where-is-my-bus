# Maintenance & Disaster Recovery SOP

## 1. Scheduled Maintenance Procedures
- **Window:** Saturday 02:00 AM - 04:00 AM EST.
- **Tasks Authorized:** OS Security Patching, PostgreSQL minor version upgrades, Redis cache flushing.
- **Communication:** Statuspage must be updated to "Under Maintenance" prior to execution.

## 2. Backup & Restore Procedures
- **Backup Execution:** Cron job executes `./scripts/backup.sh` daily at 01:00 AM.
- **Restore Validation:** Every 1st of the month, the backup file is restored into a designated staging environment to prove data viability.

## 3. Disaster Recovery (DR) Operational Guide
- **RTO (Recovery Time Objective):** 4 Hours.
- **RPO (Recovery Point Objective):** 24 Hours.
- **Failover Plan:** In the event of primary data center loss, SRE will execute terraform scripts to provision identical infrastructure in the secondary region, restore the latest `.sql` dump, and execute the DNS failover via Cloudflare.

## 4. Security Operations & Compliance Checklists
- **Bi-Weekly Verification:** Let's Encrypt certificates are valid for > 30 days.
- **Monthly Verification:** IAM Roles and SSH Access Keys of terminated employees have been successfully revoked.
- **Quarterly Verification:** Execute penetration testing and update the GDPR Data Processing Addendums.

## 5. Business Continuity Procedures
- In the event of physical office loss or key personnel unavailability (e.g., pandemic, severe weather), the "Where Is My Bus" infrastructure is fully operable remotely by any authorized SRE via secure VPN. The CTO designates emergency stand-in roles for the Incident Commander.
