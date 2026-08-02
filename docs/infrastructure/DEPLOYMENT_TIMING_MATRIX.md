# Deployment Timing Matrix

This matrix establishes precise estimated timelines for each phase of the production deployment to ensure maintenance windows are strictly adhered to and MTTR is minimized during rollbacks.

## Standard Deployment Sequence

| Phase | Activity | Estimated Duration | Hard Timeout | Responsible |
| :--- | :--- | :--- | :--- | :--- |
| **1. Pre-Flight** | Trigger GitHub Actions Pipeline & CAB Approval | 2 minutes | 5 minutes | Eng Lead |
| **2. Build & Scan** | Build Docker Images, run Trivy & Syft SBOM | 4 minutes | 10 minutes | CI/CD |
| **3. Transfer** | Push images to ECR / Pull images to Prod Host | 3 minutes | 8 minutes | CI/CD |
| **4. Pre-Start** | Database Backup (`backup.sh`) | 1 minute | 3 minutes | SRE |
| **5. Migration** | Execute Prisma `migrate deploy` | 30 seconds | 2 minutes | SRE |
| **6. Container Boot**| Nginx & Node.js backend startup sequence | 10 seconds | 30 seconds | Docker |
| **7. Validation** | Execute `verify.sh` and `smoke-test.sh` | 1 minute | 3 minutes | QA / SRE |
| **8. Traffic Shift** | Nginx upstream reload (Blue/Green cutover) | < 1 second | 5 seconds | SRE |

**Total Estimated Deployment Time:** ~11 Minutes 40 Seconds

## Rollback Sequence (Emergency)

| Phase | Activity | Estimated Duration | Hard Timeout | Responsible |
| :--- | :--- | :--- | :--- | :--- |
| **1. Decision** | Triage P0 failure and declare rollback | 2 minutes | 5 minutes | Incident Cmdr |
| **2. DB Revert** | Execute `db-rollback.sh` (if schema corrupted) | 2 minutes | 5 minutes | SRE |
| **3. Image Revert** | Execute `rollback.sh <previous_tag>` | 10 seconds | 30 seconds | SRE |
| **4. Traffic Shift** | Nginx reload back to stable upstream | < 1 second | 5 seconds | SRE |

**Total Estimated Rollback Time:** ~4 Minutes 10 Seconds
