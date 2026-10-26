# Winterwartung

Web-App zur digitalen Organisation der Winterwartung unserer Vereins-Segelflugzeuge.

Ziel ist, die Winterarbeit zu digitaliseren und klar verfolgen zu können was wann gemacht wird. Aufgaben können klar zu geteilt werden und alle Daten sind zentralisiert.

## Funktionen

### Arbeitsplanung
- **Kanban-Board pro Flugzeug**: Alle Arbeitspakete eines Flugzeugs auf einen Blick, von „offen“ über „in Arbeit“ bis „erledigt“. Tracking wer was erledigt hat.
- **Nachverfolgung**: Für jeden Schritt ist festgehalten, wer ihn wann erledigt und abgezeichnet hat.
- **Eignung**: Jedes Arbeitspaket zeigt, für wen es geeignet ist, damit sich auch Neue und Flugschüler passende Aufgaben aussuchen können.
- **Zeitplanung**: Welches Flugzeug ist wann in der Werkstatt dran?
- **Werkstattleitung**: Übersicht, wer an welchem Tag vor Ort ist und die Leitung übernimmt.

### Technische Unterlagen
- **Dokumente**: Wartungshandbücher, Wägeberichte... Direkt aus der App aufrufbar, passend zum jeweiligen Flugzeug.
- **Fristen**: Werden automatisch aus Vereinsflieger übernommen.
- **Mängelliste**: Wird automatisch aus Vereinsflieger übernommen.
- **Befunde**: Neue Befunde können mit Foto direkt am Tablet erfasst werden.

### Material
- **Material und Bestellungen**: Was wird gebraucht, was ist bestellt, was ist schon da?

## Nutzung

- **Werkstatt**: Tablet im Browser, App-Adresse als Lesezeichen bzw. auf dem Startbildschirm
- **Zu Hause / Büro**: Aufruf über die URL im Browser


## Technicals

- **Backend**: kleines VPS bei Hetzner
- **Hosting**: GitHub Pages
- **PWA** für offline Funktionalität am Tablet

### Mock-Seite (aktueller Stand)

Statische Vorschau ohne Backend: Vue 3 + Vite + TypeScript, alle Daten liegen in `src/mock/`.
Änderungen in der Demo werden im Browser gespeichert und lassen sich über „Demo zurücksetzen“ in der Seitenleiste verwerfen.

```bash
npm install
npm run dev
```

`npm run build` erzeugt die statische Seite in `dist/`. Bei jedem Push auf `main` baut der Workflow
`.github/workflows/deploy.yml` die Seite und veröffentlicht sie über GitHub Pages
(in den Repo-Einstellungen unter *Pages* als Quelle „GitHub Actions“ wählen).

### Rollen
- Es gibt eine Nutzerrolle ohne Login mit Lesezugriff, eine Adminrolle mit allen Berechtigungen sowie eine Werkstattleiterrolle mit fast allen Berechtigungen
  (Tablet Zugriff)

### Dummy Data

#### Flugzeuge
- ASK21 D-5071
- ASK23 D-6987
- ASG32 D-3362
- ARCUS-T D-KSBN
- Discus-2b D-8586
- LS8 D-0169

#### Nutzer
- Admin: Nuno
- Werkstattleiter: Tablet
- Werkstattleiter: Matze
- Werkstattleiter: Heinrich
