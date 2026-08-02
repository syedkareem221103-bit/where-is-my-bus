# Disaster Recovery Checklist

## Trigger Conditions
- Total AZ Failure
- Unrecoverable Database Corruption
- Ransomware / Data compromise

## Recovery Steps
- [ ] Notify stakeholders and declare P0 Incident
- [ ] Provision new host infrastructure (Terraform / CloudFormation)
- [ ] Retrieve latest encrypted DB backup from cold storage (S3)
- [ ] Execute `./restore.sh <backup_file>` on new host
- [ ] Update DNS records in Cloudflare/Route53
- [ ] Execute `./scripts/deploy.sh` on new host
- [ ] Execute `./scripts/verify.sh`
- [ ] Verify Data Integrity
- [ ] Resolve P0 Incident
