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
- **Dokumente** wie Flughandbuch, Wartungshandbuch, Aufbauanleitung und Gewichtsübersicht: PDF oder Bild hochladen, im Viewer ansehen, herunterladen; gültig für ein Flugzeug, alle eines Typs oder den ganzen Verein
- **Fristen** aus Vereinsflieger, mit Warnung bei bald ablaufenden Terminen und Stand des letzten Abgleichs
- **Mängel/Befunde**: Mängel aus Vereinsflieger und eigene Befunde mit Fotos (Kamera, werden verkleinert), daraus direkt eine Kanban-Karte anlegen
- **Material**: Ersatzteile und Bestellungen für dieses Flugzeug

**Meine Sachen**: eigene Karten in Arbeit, zugewiesene Mängel, eigene Bestellungen und Befunde; für die Werkstattleitung alles, was auf Abzeichnung wartet

**Inventur**
- Verbrauchsstoffe aus dem Lager und Ersatzteile mit Lagerort und Bestand
- Bestellliste: muss bestellt werden → bestellt → geliefert (mit gelieferter Menge)
- Bestellungen auch ohne Artikel, z. B. für einmalige Besorgungen

**Verwaltung** (Admin): Saison (neue Saison aus Kanban-Vorlagen starten, frühere Saisons nachlesen), Kanban-Vorlagen, Flugzeuge (anlegen, bearbeiten, ausmustern), Konten mit Rollen

**Rollen und Anmeldung:** Mitglieder geben beim ersten Öffnen Vor- und Nachnamen ein (ohne Passwort), damit jede Änderung einen Namen hat. Werkstattleiter, Admins und das Werkstatt-Tablet melden sich mit E-Mail und Passwort an: Werkstattleiter und Admins zeichnen ab und planen die Tage (auf den Flugzeugseiten gleiche Rechte); nur Admins haben die Verwaltung (Konten, Saison, Flugzeuge, Vorlagen) und ändern Werkstattzeiträume. Ohne Namen kann man alles ansehen, aber nichts ändern. Die E-Mail ist nur der Anmeldename, die App verschickt keine E-Mails: Den Link zum Passwort-Setzen erstellt ein Admin in der Verwaltung und gibt ihn selbst weiter. In der Demo gilt jedes Passwort; die Testkonten stehen im Anmelde-Popup.

**Speichern:** Anzeige „Gespeichert“ / „Speichert …“ / „Offline · n Änderungen warten“; ohne Netz arbeitet man weiter, die Änderungen gehen beim Wiederverbinden raus. Ändert jemand gleichzeitig dieselbe Karte, warnt das Formular. In der Demo: „Offline testen“ unten links, zweiter Tab als zweites Gerät.

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
Das ist die Demo mit Beispieldaten. Die echte App (mit Backend) liefert der Server auf dem Hetzner-VPS aus, siehe `server/README.md`.

## Technik

- Vue 3, Vue Router, Vite, TypeScript
- eigenes CSS mit Design-Tokens in `src/styles/base.css`
- Beispieldaten in `src/mock/`, gemeinsamer Zustand in `src/store.ts`
- responsiv für Tablet, Desktop und Handy

Mehr zur Code-Struktur und zu den Konventionen steht in [CLAUDE.md](CLAUDE.md).

## Geplant

- **Backend** auf einem kleinen VPS bei Hetzner statt Beispieldaten
- **Anbindung an Vereinsflieger** für Fristen und Mängel
- **Echte Anmeldung** der Sonderkonten (Passwort, Link zum Passwort-Setzen), Rechte zusätzlich im Backend prüfen
- **PWA** für die Nutzung am Tablet auch ohne Netz
- Dateien auf dem Server statt im Browser (`src/api/files.ts`), Vereinsflieger-Abgleich auf dem Server (`src/api/vereinsflieger.ts`)
