# Eigener Server

So richtest du die App für deinen Verein auf einem eigenen Server ein. Was du brauchst, steht in der [README](../README.md#eigener-server).

## 1. Ordner anlegen

Z. B. `/srv/wartung` anlegen und dort die [`docker-compose.yml`](../backend/docker-compose.yml) aus diesem Repo ablegen.
Alles, was dein Verein speichert (Datenbank, Fotos, Dokumente, Logo), liegt danach in `/srv/wartung/data` – das ist der Ordner fürs Backup.

## 2. Einstellungen

In `data/app.env`:

```bash
APP_URL=https://wartung.mein-verein.de
ADMIN_NAME=Vorname Nachname
NODE_ENV=production
```

## 3. Name und Logo des Vereins

In `data/club/`:

```text
data/club/club.json
data/club/logo.png
```

```json
{
  "name": "Segelflugverein Musterstadt",
  "app": "Winterwartung",
  "url": "https://wartung.mein-verein.de",
  "logo": "logo.png"
}
```

`name` steht im Seitentitel, `app` in der Seitenleiste, `url` wird zum QR-Code fürs Werkstatt-Tablet und den Aushang (leer lassen = kein QR-Code).
Das Logo darf PNG oder SVG sein, ideal etwa 300 × 150 Pixel. Ohne diesen Ordner zeigt die App Name und Logo des Aero-Club Bad Nauheim.
Änderungen wirken sofort, ohne Neustart.

## 4. Starten

```bash
cd /srv/wartung && docker compose up -d && docker compose logs app | grep passwort
```

Im Log steht der Link, mit dem der erste Admin sein Passwort setzt. Danach legt der Admin in der App Flugzeuge, Kanban-Vorlagen und Konten an.

## 5. HTTPS

Den Webserver auf `127.0.0.1:8081` weiterleiten lassen und Uploads bis 30 MB erlauben. Beispiel für nginx:

```nginx
server {
  server_name wartung.mein-verein.de;
  client_max_body_size 30m;
  location / {
    proxy_pass http://127.0.0.1:8081;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_buffering off;   # für die Live-Aktualisierung (Server-Sent Events)
  }
}
```

## Updates

`docker compose pull && docker compose up -d`. Offene Seiten laden die neue Version von selbst, sobald niemand tippt.

Mehr Details (alle Einstellungen, Passwort-Link über die Kommandozeile, automatisches Deployment aus einem eigenen Fork) in [backend/README.md](../backend/README.md) (Englisch).

