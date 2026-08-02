# Compliance & Security Validation Checklist

This checklist must be fully verified and approved by the SecOps Lead before V1.0 Go-Live is authorized.

- [ ] **HTTPS Enforced:** All traffic over port 80 is strictly 301 redirected to 443 by Nginx.
- [ ] **TLS Validated:** Let's Encrypt TLS 1.3 certificate chain is active and achieves an A+ on SSL Labs.
- [ ] **JWT Hardening:** Algorithms are strictly constrained to HS256/RS256, and tokens expire within required limits.
- [ ] **RBAC Isolation:** Multi-tenant boundaries explicitly verified; Organization A cannot access Organization B's data.
- [ ] **Rate Limiting Active:** IP-based throttling active on Edge Proxy (e.g., 100 req/sec max per IP).
- [ ] **Audit Logging Intact:** Deployment user interactions immutably captured in system logs.
- [ ] **Backup Verification:** `.sql` dump is actively verifying as non-empty.
- [ ] **Encryption at Rest:** Disk-level encryption verified on target host infrastructure block storage.
- [ ] **GDPR / Data Protection:** PII correctly omitted or masked from all Winston log streams.
- [ ] **Secrets Management:** `.env.production` is strictly locked down (chmod 600) and decoupled from the Git repository.
