# Vultr deploy runbook

> Status: **written, not yet executed.** Update this file with the exact commands once run.

## 0. DNS first (propagation takes time)
GoDaddy Registry domain → DNS → A records:
- `@`   → `<VULTR_IP>`
- `www` → `<VULTR_IP>`

Check: `nslookup <domain>` returns the VM IP.

## 1. VM
Vultr Cloud Compute, Ubuntu 24.04, 2 vCPU / 4 GB. In the Vultr firewall group allow TCP 22, 80, 443.

```bash
ssh root@<VULTR_IP>
apt-get update && apt-get install -y ca-certificates curl git ufw
curl -fsSL https://get.docker.com | sh
ufw allow OpenSSH && ufw allow 80/tcp && ufw allow 443/tcp && ufw --force enable
```

## 2. App
```bash
git clone <PUBLIC_REPO_URL> rep-rally && cd rep-rally
cp .env.example .env && nano .env
#   DEMO_MODE=false
#   DATABASE_URL=<Tiger Cloud connection string, sslmode=require>
#   MESSENGER=photon  SPECTRUM_PROJECT_ID=...  SPECTRUM_PROJECT_SECRET=...
#   SESSION_SECRET=$(openssl rand -hex 32)  ADMIN_TOKEN=$(openssl rand -hex 16)
#   APP_BASE_URL=https://<domain>
#   DOMAIN=<domain>
docker compose -f infra/docker-compose.yml --env-file .env run --rm api bun apps/api/src/migrate.ts
docker compose -f infra/docker-compose.yml --env-file .env up -d --build
```

## 3. Verify
```bash
curl -s https://<domain>/api/health
docker compose -f infra/docker-compose.yml logs -f agent
```
Open `https://<domain>` on a phone → camera permission prompt should appear (HTTPS is required for camera).

## Redeploy
```bash
git pull && docker compose -f infra/docker-compose.yml --env-file .env up -d --build
```
