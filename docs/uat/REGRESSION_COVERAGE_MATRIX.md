# Regression Coverage Matrix

| Core UAT Path | E2E Automated Coverage (Playwright) | Risk of Manual Regression | Coverage Status |
| :--- | :--- | :--- | :--- |
| Login / RBAC Routing | `auth.spec.ts` | Low | Covered |
| Driver GPS Streaming | `driver-journey.spec.ts` | Medium (network variable) | Covered |
| Driver SOS Trigger | `driver-journey.spec.ts` | Low | Covered |
| Parent Dashboard ETA | `parent-journey.spec.ts` | Low | Covered |
| Live KPI Dashboard | `operator-dashboard.spec.ts` | Low | Covered |
| Tenant Isolation | `multi-tenant.spec.ts` | Low | Covered |
| Network Degradation | `network.spec.ts` | Medium | Covered |
| Accessibility (WCAG) | `accessibility.spec.ts` | Low | Covered |
