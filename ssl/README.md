# SSL Certificate Placement Guide

This directory is intended for manually placed SSL certificates if you are not using an automated ACME client (like Let's Encrypt Certbot) bundled directly within the edge proxy.

## Required Files
If terminating SSL manually, ensure the following files exist in this directory:
- `fullchain.pem` (The signed certificate combined with the issuing CA bundle)
- `privkey.pem` (The private key corresponding to the certificate)

## Let's Encrypt (Certbot)
If you are using Certbot on the host machine, you do not need to place files here. Instead, map the Certbot volume directly into Nginx via `docker-compose.prod.yml`:
```yaml
volumes:
  - /etc/letsencrypt:/etc/letsencrypt:ro
```

*Note: Ensure strict file permissions (`chmod 600`) for any private key files placed in this directory.*
