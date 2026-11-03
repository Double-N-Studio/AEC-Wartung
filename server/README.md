# Server

Backend of the winter maintenance app: Hono on Node 24, SQLite via Drizzle. So far only the scaffold with
`GET /api/health`; what the frontend expects in endpoints and data model is in `../docs/backend.md`.

## Development

```bash
cd server
npm install
npm run build && npm run dev   # http://localhost:3000/api/health, database in server/data/
npm run db:generate            # new migration after changes to src/schema.ts
```

Migrations from `drizzle/` run on every start. After changing the schema always run `db:generate`
and commit the generated file.

## Where things run

Hetzner CX23 "nuno-vps" (178.105.54.205), shared with other projects (camper, GitLab runner).

| What | Where |
|---|---|
| Hostname | `wartung.nuno-ferreira.de` (temporary), later `wartung.aecbn.de` |
| TLS | Let's Encrypt via certbot, renews automatically |
| Reverse proxy | nginx, `/etc/nginx/sites-available/wartung` → `127.0.0.1:8081`, uploads up to 30 MB |
| Compose project | `/srv/wartung` (copy of `server/`), user `deploy` |
| Data | `/srv/wartung/data` (SQLite, uploads) – on the root disk so Hetzner backups cover it |
| Docker | `data-root` is on the 40 GB volume (`/mnt/HC_Volume_107352022/docker`) because the root disk is taken by the GitLab runner |

## Deployment

`.github/workflows/deploy-server.yml` builds the image to `ghcr.io/double-n-studio/aec-wartung-server`,
copies `server/` via rsync to `/srv/wartung` and runs `docker compose up -d`. Runs on push to `main`
when something under `server/` changed, and checks `/api/health` at the end.

One-time setup on the VPS (as root): `bash server/setup/deploy-user.sh "<public key>"`;
the private key goes into the repo as the secret `DEPLOY_SSH_KEY`.

## Switching the domain to wartung.aecbn.de

1. The club admin creates an A record `wartung.aecbn.de → 178.105.54.205` (and AAAA to the IPv6 if wanted).
2. On the VPS: `certbot certonly --nginx -d wartung.aecbn.de`
3. Put the new `server_name` and certificate paths into `/etc/nginx/sites-available/wartung`, `nginx -t && systemctl reload nginx`.
4. Keep the old hostname as a redirect or remove it.
