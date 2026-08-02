# Changelog

All notable changes to the "Where is My Bus" project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0-rc.1] - 2026-08-02
### Added
- **Authentication & RBAC:** JWT-based secure authentication with hierarchical roles (Super Admin, Org Admin, Operator, Driver, Parent).
- **Multi-Tenant Architecture:** Strict PostgreSQL RLS-style logic enforced via Prisma middleware for complete data isolation.
- **GPS Tracking Engine:** Real-time geolocation ingestion utilizing Redis Pub/Sub for high-throughput WebSocket broadcast.
- **ETA Engine:** AI-driven route optimization and dynamic ETA calculations.
- **Attendance System:** Secure scanning and logging of student boarding/alighting with instant parent notifications.
- **Geofencing & Alerts:** Turf.js spatial calculation triggers for 500m proximity warnings and Emergency SOS dispatch.
- **Operator Dashboard:** Live KPIs, incident tracking, and visual regression tested React interfaces.
- **Infrastructure:** Multi-stage Dockerized deployment pipeline via GitHub Actions.
- **Security Validation:** Deep CodeQL SAST, Trivy container scanning, and Gitleaks secrets analysis.
- **Performance Benchmarking:** Scalability hardened to support 1,000+ concurrent Virtual Users via k6 load testing and Lighthouse CI.

### Changed
- None (Initial Release)

### Removed
- None (Initial Release)
