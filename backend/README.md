# Server

Backend of the winter maintenance app: Hono on Node 24, SQLite via Drizzle. It stores the app state as records,
checks every change against the permission rules, holds the sessions and the uploaded files and tells the devices
about new revisions via Server-Sent Events. The contract with the frontend is `../docs/backend.md`.

The server also delivers the frontend: the image builds the app with `VITE_API_URL=/api` (without `.env`,
so the real date applies) and serves it from `WEB_DIR`, so app and API share one origin. Without
`WEB_DIR` (local development) Vite serves the frontend and proxies `/api` here.

## Code

| File | What |
|---|---|
| `src/index.ts` | entry: env, database, first start, static frontend, port |
| `src/app.ts` | all `/api` routes (`createApp({ db, dataDir, now })`) |
| `src/changes.ts` | `POST /changes`: retry → 401 → 409 → 422/403 → apply, aircraft cascade, one transaction |
| `src/rules.ts` | permission rules, pure functions |
| `src/validate.ts` | shape checks per collection (zod) |
| `src/state.ts` | records ↔ `AppState`, revision |
| `src/auth.ts` | cookie sessions, scrypt, set-password tokens, rate limit |
| `src/events.ts`, `src/files.ts` | SSE, file uploads (`DATA_DIR/files/<id>`) |
| `src/seed.ts`, `src/cli.ts` | first start, password link from the command line |

## Development

```bash
cd backend
npm install
npm run build && npm run dev   # http://localhost:3000/api/health, database in backend/data/
npm test                       # build + node:test against an in-memory database
npm run db:generate            # new migration after changes to src/schema.ts
```

Migrations from `drizzle/` run on every start. After changing the schema always run `db:generate`
and commit the generated file. The Docker build runs `npm test`, so a failing test stops the deploy.

Local first start: put `ADMIN_NAME`, `ADMIN_EMAIL` and `APP_URL=http://localhost:5173` into `backend/.env`
(gitignored), start the server and open the set-password link from the log. For the frontend set
`VITE_API_URL=/api` in `frontend/.env.local`; Vite proxies `/api` to port 3000.

## Configuration

| Variable | Default | What |
|---|---|---|
| `PORT` | `3000` | |
| `DATA_DIR` | `data` (`/data` in the image) | SQLite file `wartung.db` and uploads `files/` |
| `WEB_DIR` | – (`/app/web` in the image) | built frontend; without it only the API runs |
| `NODE_ENV` | (`production` in the image) | `production` marks the session cookie `Secure` |
| `APP_URL` | – | public address, for the set-password links in the log, e.g. `https://wartung.nuno-ferreira.de` |
| `ADMIN_NAME`, `ADMIN_EMAIL` | – | first admin, created on the first start (see below) |
| `SEASON_LABEL`, `SEASON_START`, `SEASON_END` | this winter | first season; default first Saturday of November to last Saturday of March |

On the VPS these go into **`/srv/wartung/data/app.env`**, which `docker-compose.yml` loads if it exists
(`data/` is excluded from the deploy rsync, so the file survives deploys). The operator creates it once:

```bash
# /srv/wartung/data/app.env
APP_URL=https://wartung.nuno-ferreira.de
ADMIN_NAME=Vorname Nachname
ADMIN_EMAIL=admin@example.org
NODE_ENV=production
```

then `cd /srv/wartung && docker compose up -d` (or wait for the next deploy).

## First start

When there is no account yet, the server creates the season, `vereinsflieger: { lastSync: '' }` and the admin
from `ADMIN_NAME`/`ADMIN_EMAIL`, and prints the set-password link (valid 7 days) to the log:

```bash
docker compose logs app | grep passwort
```

Without `ADMIN_NAME`/`ADMIN_EMAIL` it only logs a warning and keeps running; the seed happens on the next start
once they are set. Everything else (aircraft, templates, accounts) the admin maintains in the app.

## Password link from the command line

There are no e-mails and no "forgot password"; admins create links for other special accounts in the app. If the
admin lost their own password:

```bash
docker compose exec app node dist/src/cli.js admin@example.org   # on the VPS
npm run password-link -- admin@example.org                       # locally
```

Older links of the account stop working.

## Where things run

Hetzner CX23 "nuno-vps" (178.105.54.205), shared with other projects (camper, GitLab runner).

| What | Where |
|---|---|
| Hostname | `wartung.nuno-ferreira.de` (temporary), later `wartung.aecbn.de` |
| TLS | Let's Encrypt via certbot, renews automatically |
| Reverse proxy | nginx, `/etc/nginx/sites-available/wartung` → `127.0.0.1:8081`, uploads up to 30 MB |
| Compose project | `/srv/wartung` (copy of `backend/`), user `deploy` |
| Data | `/srv/wartung/data` (SQLite, uploads) – on the root disk so Hetzner backups cover it |
| Docker | `data-root` is on the 40 GB volume (`/mnt/HC_Volume_107352022/docker`) because the root disk is taken by the GitLab runner |

## Deployment

`.github/workflows/deploy-server.yml` builds the image (context: repo root, `backend/Dockerfile`) to `ghcr.io/double-n-studio/aec-wartung-server`,
copies `backend/` via rsync to `/srv/wartung` and runs `docker compose up -d`. Runs on push to `main`
when the server or the frontend changed, and checks `/api/health` and the start page at the end.

One-time setup on the VPS (as root): `bash backend/setup/deploy-user.sh "<public key>"`;
the private key goes into the repo as the secret `DEPLOY_SSH_KEY`.

## Switching the domain to wartung.aecbn.de

1. The club admin creates an A record `wartung.aecbn.de → 178.105.54.205` (and AAAA to the IPv6 if wanted).
2. On the VPS: `certbot certonly --nginx -d wartung.aecbn.de`
3. Put the new `server_name` and certificate paths into `/etc/nginx/sites-available/wartung`, `nginx -t && systemctl reload nginx`.
4. Keep the old hostname as a redirect or remove it.
