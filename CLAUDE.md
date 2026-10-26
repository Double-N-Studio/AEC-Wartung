# CLAUDE.md

Hinweise für die Arbeit an diesem Repo.

## Worum es geht

Web-App für die Winterwartung der Vereins-Segelflugzeuge des Aero-Club Bad Nauheim.
Aktueller Stand ist eine **statische Mock-Seite** ohne Backend, gedacht als klickbare Vorschau für den Vorstand.
Alle Daten sind Beispieldaten; „heute“ ist fest der **16.01.2027** (`src/utils/date.ts`).

## Befehle

```bash
npm install        # Abhängigkeiten
npm run dev        # Entwicklungsserver (http://localhost:5173)
npm run build      # Typprüfung (vue-tsc) + Produktions-Build nach dist/
npm run preview    # Build lokal ansehen
```

Vor jedem Commit `npm run build` laufen lassen – es gibt keine Tests, die Typprüfung ist der Check.

## Stack

- Vue 3 mit `<script setup lang="ts">`, Vue Router (Hash-Modus), Vite, TypeScript (auf 5.9 gepinnt, weil `vue-tsc` TS 7 noch nicht unterstützt)
- Kein UI-Framework, keine State-Library: eigenes CSS und ein reaktiver Store
- Deployment: GitHub Pages über `.github/workflows/deploy.yml` bei Push auf `main`

## Struktur

```
src/
  main.ts, App.vue, router.ts   Einstieg, Layout (Seitenleiste / Handy-Menü), Routen
  store.ts                      gemeinsamer Zustand + alle Aktionen, persistiert in localStorage
  types.ts                      Datenmodell
  mock/data.ts                  Ausgangsdaten (initialState)
  mock/people.ts                Testkonten (Personen + Werkstatt-Tablet), Rollen-Bezeichnungen
  utils/                        Datums-Formatierung, Eignungsstufen
  styles/base.css               Design-Tokens (CSS-Variablen) und Basisklassen
  components/                   wiederverwendbare Bausteine (AppModal, Badges, DropdownSelect …)
  components/inventory/         Bestellliste + Bestandstabelle + Popups (InventoryWorkspace, Inventur und Material-Reiter)
  views/                        Seiten: Zeitplan, Inventur, Verwaltung (Konten, Saison), FAQ
  views/aircraft/               Flugzeug-Reiter: Kanban, Dokumente, Fristen, Mängel/Befunde, Material
  views/inventory/              Popups der Inventur
public/docs/                    Vorschaubilder der Dokumente
```

## Konventionen

- **Sprache:** Oberfläche, Kommentare und Commit-Nachrichten auf Deutsch; Bezeichner im Code auf Englisch.
- **Zustand nur über den Store ändern.** Neue Aktionen gehören in `store.ts`, nicht in Komponenten – auch kein `v-model` direkt auf Store-Objekte. Änderungen an Kanban-Karten, Mängeln, Bestellungen, Artikeln und Werkstatttagen schreiben einen Eintrag in `history`; Freitext (Kommentare) wird beim Verlassen des Felds gespeichert, nicht pro Tastendruck.
- **Rollen:** Admin, Werkstattleiter, Mitglied, nicht angemeldet. Rechte nur über `can('edit' | 'lead' | 'admin')` aus dem Store prüfen, nie über die Rolle direkt. `edit` = alle Angemeldeten, `lead` = abzeichnen und Werkstatttage planen, `admin` = Konten, Saison, Werkstattzeiträume. Admin und Werkstattleiter haben vorerst dieselben Rechte. Ohne Recht wird ein Bedienelement ausgeblendet oder als Text angezeigt, nicht nur deaktiviert.
- **Personen sind Konto-IDs** (`UserId`) in allen Feldern (`who`, `doneBy`, `owner` …); angezeigt wird über `userName()`. Entfernte Konten bleiben mit `removed` erhalten, damit der Verlauf lesbar bleibt. `SYSTEM` steht für Einträge aus Vereinsflieger.
- **Bearbeiten/Löschen** im Popup-Kopf über `#tools` (Stift, Mülleimer), Löschen immer mit `ConfirmModal`. Formulare zum Anlegen und Bearbeiten sind dieselbe Komponente (`TaskFormModal`, `DefectFormModal`, `ItemFormModal`).
- **Datenmodell geändert?** `STORAGE_KEY` in `store.ts` hochzählen, sonst laden Browser alte, inkompatible Demo-Daten.
- **Alle Flugzeuge haben denselben Inhalt wie die ASG32.** `initialState()` kopiert die ASG32-Datensätze pro Flugzeug mit eigenen IDs (`<flugzeug>-<id>`). Neue Datensätze für ein Flugzeug daher in den ASG32-Listen pflegen.
- **Inventur und Material-Reiter teilen sich die Daten.** Der Material-Reiter filtert nur (`fitsAircraft`, `order.forWhat === type`).
- **Popups** immer über `AppModal` (Escape, Klick daneben, Bottom-Sheet auf dem Handy). Aufbau: blauer Kopf mit Typ-Symbol (`icon`), Titel, `subtitle` und Status-Chips (`#status`, Klassen `pill pill-…`); Inhalt mit eingeklapptem `HistoryList` am Ende; die Hauptaktion steht immer in der Fußleiste (`#footer` rechts, Info in `#meta` links), nie im Inhalt. Popover, die aus scrollbaren Bereichen herausragen müssen, per `<Teleport to="body">`.
- **Farben und Abstände** über die CSS-Variablen aus `base.css`, keine neuen Hex-Werte in Komponenten, wenn es ein Token gibt.
- **Responsiv:** Breakpoints `900px` (Seitenleiste wird Menü, Tabellen werden Karten) und `640px` (Handy). Neue Seiten in beiden Breiten prüfen.
- **Statische Assets:** Bilder in Templates per `import` aus `src/assets` einbinden; dynamische Pfade (z. B. Dokument-Vorschauen) relativ ohne führenden `/`, weil `base: './'` gilt.
- **Bewusst ohne Funktion** (führen „ins Nichts“): Herunterladen, Foto aufnehmen (nur Platzhalter), Datei-Upload (simuliert). Statt Login wechselt man unten links das Testkonto (gespeichert unter eigenem localStorage-Schlüssel, übersteht „Demo zurücksetzen“).

## Produkt-Entscheidungen aus dem Feedback

- Startseite ist der Zeitplan; gearbeitet wird nur samstags.
- Der Reiter heißt „Kanban“, ein Eintrag „Kanban-Karte“ (auch bei Mängeln/Befunden); im Code bleibt es `Task`.
- Keine Helfer-Zuteilung bei Arbeitspaketen; wer startet, ergibt sich aus dem angemeldeten Konto und steht nur im Verlauf. Das Werkstatt-Tablet ist ein eigenes Konto (Gerät, Rolle Werkstattleiter); Namen der Helfer werden dort nicht abgefragt.
- Abzeichnen: als angemeldete Person, am Werkstatt-Tablet als Werkstattleitung des Tages. Abgezeichnete Karten sind gesperrt, bis die Werkstattleitung die Abzeichnung zurücknimmt.
- Eine erledigte Kanban-Karte schließt den verknüpften Mangel/Befund nicht automatisch.
- Mängel aus Vereinsflieger lassen sich in der App nicht bearbeiten oder löschen (nur eigene Befunde). Rückschreiben nach Vereinsflieger kommt als letzter Schritt.
- Flugzeuge sind fest. Welche Flugzeuge an einem Samstag in der Werkstatt sind, ergibt sich aus ihren Zeiträumen (`planesOn`); Admins ändern die Zeiträume im Saisonplan über den Stift per Ziehen.
- Arbeitspakete haben keine Bereiche (Rumpf, Fläche …), nur Eignungsstufen.
- Inventur: nur Verbrauchsstoffe oder Ersatzteile (kein „Alle“), „leer“ meldet man durch Bestand 0, Statusanzeigen sind Text, keine Buttons.
- Inventur als Zählliste: Gruppen Leer / Fast leer / Vorhanden (alphabetisch), gezählt wird direkt in der Zeile (Stepper bzw. Genug / Fast leer / Leer, beide gleich breit). „Fast leer“ gibt es nur bei Artikeln ohne Stückzahl (`FLAG` in `utils/stock.ts`). Lagerorte sind nur Freitext, nie Gruppen. Bestellliste steht als Seitenspalte rechts (schmal: oben).
- Der Button „Auf Bestellliste“ ist immer weiß (sekundär).
- Kalender heißt „Werkstatt-Termin“: Flugzeuge sind der Titel eines Samstags, die Werkstattleitung steht als Untertitel ohne Avatar. „Leitung offen“ ist kein Warnstatus (keine gelbe Fläche, kein Warnsymbol).
- Mängel/Befunde-Reiter: Zähler ohne gelbe Markierung (offene Mängel sind Dauerzustand).
- Arbeitspaket ↔ Mangel/Befund: Kanban-Karte zeigt den Ursprung („Befund: …“), Popups verlinken gegenseitig direkt auf den Eintrag (`?befund=` / `?paket=`).
- Kanban: Checklisten-Fortschritt (z. B. 2/4) erst ab „In Arbeit“, nicht bei „Offen“.
- Kanban-Karten: Eignungs-Tag rechts neben dem Titel, darunter die Beschreibung (max. 2 Zeilen); Mindesthöhe, damit Karten ohne Beschreibung keine dünnen Streifen werden.
- Neue Bestellung über den „+“-Button auf der Karte „Muss bestellt werden“ (gleiches Design wie im Kanban), nicht oben rechts auf der Seite.
- Bestellliste: Bei ähnlichem Namen schlägt das Formular dezent „Meinst du …?“ (Textlink unter dem Feld) einen Inventur-Artikel vor, damit die Bestellung dem Artikel zugeordnet wird.
- Tages-Popup im Kalender: Werkstattleitung über den Stift neben dem Namen ändern, dazu ein Kommentarfeld pro Tag. Keine „Abnahme“-Einträge und keine Saisonstart-Tage im Kalender.
- Flugzeug-Seite: Kopf nur mit Typ, Kennzeichen und Pate; der Fortschritt (x von y erledigt) steht im Saisonplan (Gantt-Balken und Popover).
- Checkliste steuert den Status: erster Haken startet, alle Haken melden erledigt, ein entfernter Haken nimmt „Erledigt“ zurück – außer nach dem Abzeichnen.
- Beispieldaten: abgeschlossene Flugzeuge (ASK21, ASK23, Discus-2b) komplett erledigt, ASG32 und LS8 gemischt, Arcus-T noch nichts erledigt (`initialState()`).
