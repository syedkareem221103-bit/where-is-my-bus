# RACI Matrix for Go-Live Operations

This matrix defines the roles and responsibilities during and immediately following the V1.0 Go-Live deployment.

| Role | Responsibility | Description |
| :--- | :--- | :--- |
| **Development** | **A**ccountable | Accountable for hot-fixing any P0/P1 bugs discovered in production; Consulted on deployment steps. |
| **DevOps** | **R**esponsible | Responsible for maintaining the GitHub Actions runner and the CI/CD pipeline execution. |
| **DBA** | **R**esponsible | Responsible for monitoring Prisma migration execution and executing backups. |
| **QA** | **R**esponsible | Responsible for executing Smoke Testing validation immediately post-deployment. |
| **SRE** | **A**ccountable | Accountable for overall infrastructure stability, DNS cutover, and Blue-Green traffic shift. |
| **Security** | **C**onsulted | Consulted for final TLS and Compliance checks. |
| **Project Manager** | **I**nformed | Informed on timeline progression and CAB communication. |
| **CTO** | **A**ccountable | Accountable for the Final Go-Live Certification and overall release success. |
