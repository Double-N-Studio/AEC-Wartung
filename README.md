# Winterwartung · Aero-Club Bad Nauheim

Web-App, mit der wir die Winterwartung unserer Vereins-Segelflugzeuge planen und nachvollziehen:
wer arbeitet wann an welchem Flugzeug, was ist erledigt und abgezeichnet, welche Mängel sind offen und was muss bestellt werden.
Alles an einem Ort – am Werkstatt-Tablet genauso wie zu Hause im Browser.

> **Stand:** klickbare Mock-Seite mit Beispieldaten, ohne Backend. Sie dient als Vorschau für den Vorstand.
> Änderungen in der Demo werden nur im eigenen Browser gespeichert und lassen sich über „Demo zurücksetzen“ in der Seitenleiste verwerfen.

## Funktionen

**Zeitplan** (Startseite)
- Saisonplan: welches Flugzeug ist wann in der Werkstatt
- Werkstattleitung pro Samstag, offene Tage sind markiert und können übernommen werden
- Kommentar und Verlauf pro Tag, geschlossene Tage (z. B. Weihnachten)
- Admins verschieben die Werkstattzeiträume direkt im Saisonplan

**Pro Flugzeug**
- **Kanban** als Board (Offen · In Arbeit · Erledigt) mit Eignung für Einsteiger, Erfahrene oder nur Werkstattleiter/Prüfer, Checklisten und Abzeichnung durch die Werkstattleitung
- **Dokumente** wie Flughandbuch, Wartungshandbuch, Aufbauanleitung und Gewichtsübersicht
- **Fristen** aus Vereinsflieger, mit Warnung bei bald ablaufenden Terminen
- **Mängel/Befunde**: Mängel aus Vereinsflieger und eigene Befunde mit Fotos, daraus direkt eine Kanban-Karte anlegen
- **Material**: Ersatzteile und Bestellungen für dieses Flugzeug

**Inventur**
- Verbrauchsstoffe aus dem Lager und Ersatzteile mit Lagerort und Bestand
- Bestellliste: muss bestellt werden → bestellt → geliefert (mit gelieferter Menge)
- Bestellungen auch ohne Artikel, z. B. für einmalige Besorgungen

**Verwaltung** (Admin): Konten mit Rollen, Saison

**Rollen:** ohne Login nur lesen; Mitglieder bearbeiten Karten, Befunde, Inventur und Bestellungen; Werkstattleiter (auch das Werkstatt-Tablet) zeichnen zusätzlich ab und planen die Tage; Admins verwalten Konten und Saison. In der Demo wechselt man das Testkonto unten links.

**FAQ** für Neue und Flugschüler

## Loslegen

Voraussetzung: Node.js 22 oder neuer.

```bash
npm install
npm run dev
```

Die Seite läuft dann unter http://localhost:5173.

| Befehl | Zweck |
| --- | --- |
| `npm run dev` | Entwicklungsserver mit Hot Reload |
| `npm run build` | Typprüfung und statischer Build nach `dist/` |
| `npm run preview` | den Build lokal ansehen |

## Veröffentlichen

Jeder Push auf `main` baut die Seite über GitHub Actions (`.github/workflows/deploy.yml`) und veröffentlicht sie auf GitHub Pages.
Einmalig im Repository unter *Settings → Pages* als Quelle „GitHub Actions“ auswählen.
Durch Hash-Routing und relative Pfade funktioniert die Seite unter jedem Repo-Namen.

## Technik

- Vue 3, Vue Router, Vite, TypeScript
- eigenes CSS mit Design-Tokens in `src/styles/base.css`
- Beispieldaten in `src/mock/`, gemeinsamer Zustand in `src/store.ts`
- responsiv für Tablet, Desktop und Handy

Mehr zur Code-Struktur und zu den Konventionen steht in [CLAUDE.md](CLAUDE.md).

## Geplant

- **Backend** auf einem kleinen VPS bei Hetzner statt Beispieldaten
- **Anbindung an Vereinsflieger** für Fristen und Mängel
- **Login** statt Testkonto-Wechsel, Rechte zusätzlich im Backend prüfen
- **PWA** für die Nutzung am Tablet auch ohne Netz
- echte Datei-Uploads und Fotos von der Kamera
