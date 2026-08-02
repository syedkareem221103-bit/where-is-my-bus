# Server Setup Guide

## 1. Operating System
- Use Ubuntu 22.04 LTS or Debian 11.
- Apply all security patches: `sudo apt-get update && sudo apt-get upgrade -y`

## 2. Dependencies
- Install Docker Engine and Docker Compose.
- Install Nginx (if running outside Docker) or let Docker Compose handle it.
- Install `ufw` (Uncomplicated Firewall).

## 3. Firewall Configuration
```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow http
sudo ufw allow https
sudo ufw enable
```

## 4. SSH Hardening
- Disable Root Login (`PermitRootLogin no` in `/etc/ssh/sshd_config`).
- Disable Password Authentication (`PasswordAuthentication no`).
- Restart SSH daemon: `sudo systemctl restart ssh`.

## 5. Directory Structure
Ensure this repository is cloned securely onto the host machine, and that the `.env.production` file is created from `.env.production.template` with strict `600` permissions.
