# Infrastructure Validation Checklist

- [ ] Docker Compose correctly parses (`docker-compose -f docker-compose.prod.yml config`)
- [ ] Nginx configuration syntax is valid
- [ ] Environment variables mapping matches schema
- [ ] Database data volume is mounted persistently
- [ ] Redis data volume is mounted persistently
- [ ] Internal networks correctly isolate databases
- [ ] UFW/Firewall rules are applied
- [ ] Health endpoints (/health) are responsive
- [ ] Metrics endpoints (/metrics) are accessible by Prometheus
