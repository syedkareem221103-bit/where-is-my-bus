# Maintenance Procedures

## 1. Standard Maintenance Windows
- **Schedule:** Sundays at 02:00 AM (System Time).
- **Notification:** Inform operators and clients 48 hours prior via email / in-app notification.

## 2. Zero-Downtime Deployment
Deployments using `docker-compose` generally incur a minor sub-second restart.
- For true zero-downtime, utilize Blue/Green deployment behind the Nginx load balancer by spinning up a secondary backend container before killing the primary.

## 3. OS Patching
1. Schedule a maintenance window.
2. Ensure database backup is complete: `./backup.sh`.
3. Run `sudo apt-get update && sudo apt-get upgrade -y`.
4. Reboot host.
5. Validate environment: `./scripts/verify.sh`.

## 4. Emergency Patching
- In the event of a Critical CVE (e.g., Log4Shell, OpenSSL), bypass standard windows and execute patching immediately post-approval from the CISO.
