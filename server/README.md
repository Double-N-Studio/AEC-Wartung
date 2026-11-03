# Server

Backend der Winterwartung: Hono auf Node 24, SQLite über Drizzle. Bisher nur das Grundgerüst mit
`GET /api/health`; was das Frontend an Endpunkten und Datenmodell erwartet, steht in `../docs/backend.md`.

## Entwickeln

```bash
cd server
npm install
npm run build && npm run dev   # http://localhost:3000/api/health, Datenbank in server/data/
npm run db:generate            # neue Migration nach Änderungen an src/schema.ts
```

Migrationen aus `drizzle/` laufen bei jedem Start. Bei Änderungen am Schema immer `db:generate`
ausführen und die erzeugte Datei mit einchecken.

## Wo was läuft

Hetzner CX23 „nuno-vps“ (178.105.54.205), geteilt mit anderen Projekten (camper, GitLab-Runner).

| Was | Wo |
|---|---|
| Hostname | `wartung.nuno-ferreira.de` (vorläufig), später `wartung.aecbn.de` |
| TLS | Let's Encrypt über certbot, verlängert sich automatisch |
| Reverse-Proxy | nginx, `/etc/nginx/sites-available/wartung` → `127.0.0.1:8081` |
| Compose-Projekt | `/srv/wartung` (Kopie von `server/`), Benutzer `deploy` |
| Daten | `/srv/wartung/data` (SQLite, Uploads) – auf der Root-Platte, damit Hetzner-Backups sie erfassen |
| Docker | `data-root` liegt auf dem 40-GB-Volume (`/mnt/HC_Volume_107352022/docker`), weil die Root-Platte vom GitLab-Runner belegt ist |

## Ausrollen

`.github/workflows/deploy-server.yml` baut das Image nach `ghcr.io/double-n-studio/aec-wartung-server`,
kopiert `server/` per rsync nach `/srv/wartung` und startet `docker compose up -d`. Läuft bei Push
auf `main`, wenn sich unter `server/` etwas ändert, und prüft zum Schluss `/api/health`.

Einmalige Einrichtung auf dem VPS (als root): `bash server/setup/deploy-user.sh "<öffentlicher Schlüssel>"`,
der private Schlüssel kommt als Secret `DEPLOY_SSH_KEY` ins Repo.

## Domain-Wechsel auf wartung.aecbn.de

1. Vereins-Admin legt einen A-Record `wartung.aecbn.de → 178.105.54.205` an (und AAAA auf die IPv6, falls gewünscht).
2. Auf dem VPS: `certbot certonly --nginx -d wartung.aecbn.de`
3. In `/etc/nginx/sites-available/wartung` den neuen `server_name` und die Zertifikatspfade eintragen, `nginx -t && systemctl reload nginx`.
4. Alten Hostnamen als Weiterleitung behalten oder entfernen.
