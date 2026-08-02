# Production Deployment Checklist

- [ ] Release Candidate Tag created (e.g. v1.0.0-rc.1)
- [ ] CI/CD pipelines green
- [ ] Maintenance Window announced
- [ ] Database backup executed (`./backup.sh`)
- [ ] Configuration (`.env.production`) verified
- [ ] Deployment script executed (`./scripts/deploy.sh`)
- [ ] Post-deployment verification script executed (`./scripts/verify.sh`)
- [ ] End-to-End smoke test passed
- [ ] Maintenance Window lifted
