# CLAUDE.md

Hinweise für die Arbeit an diesem Repo.

## Worum es geht

Web-App für die Winterwartung der Vereins-Segelflugzeuge des Aero-Club Bad Nauheim.
Das Frontend ist fertig für ein Backend (Vertrag in `docs/backend.md`, Server-Gerüst in `server/`). Ohne `VITE_API_URL` läuft es als **Demo** gegen einen Schein-Server im Browser – so steht es auf GitHub Pages als klickbare Vorschau für den Vorstand.
In der Demo sind alle Daten Beispieldaten; „heute“ steht für die Demo fest auf dem **16.01.2027** (`VITE_DEMO_DATE` in `.env`). Ohne den Eintrag gilt das echte Datum. Im Code immer `today()` / `now()` aus `src/utils/date.ts` verwenden, nie `new Date()` direkt.

## Befehle

```bash
npm install        # Abhängigkeiten
npm run dev        # Entwicklungsserver (http://localhost:5173)
npm run build      # Typprüfung (vue-tsc) + Produktions-Build nach dist/
npm run preview    # Build lokal ansehen
```

Gegen das lokale Backend: `VITE_API_URL=/api` in `.env.local`; der Entwicklungsserver reicht `/api` an Port 3000 weiter.

Vor jedem Commit `npm run build` laufen lassen – es gibt keine Tests, die Typprüfung ist der Check.

## Stack

- Vue 3 mit `<script setup lang="ts">`, Vue Router (Hash-Modus), Vite, TypeScript (auf 5.9 gepinnt, weil `vue-tsc` TS 7 noch nicht unterstützt)
- Kein UI-Framework, keine State-Library: eigenes CSS und ein reaktiver Store
- Deployment: GitHub Pages über `.github/workflows/deploy.yml` bei Push auf `main`

## Struktur

```
src/
  main.ts, App.vue, router.ts   Einstieg, Layout (Seitenleiste / Handy-Menü), Routen
  store.ts                      gemeinsamer Zustand + alle Aktionen, Anmeldung, Start (boot)
  sync.ts                       Abgleich mit dem Server: Änderungen erkennen, Warteschlange, Neuladen, Konflikte
  notify.ts                     kurze Meldungen (AppToasts), z. B. abgelehnte Änderungen
  types.ts                      Datenmodell
  mock/data.ts                  Ausgangsdaten (initialState)
  mock/people.ts                Testkonten (Personen + Werkstatt-Tablet), Rollen-Bezeichnungen
  api/                          backend.ts (Schnittstelle, wählt Demo oder Server), records.ts (Zustand als Datensätze),
                                mock.ts (Schein-Server der Demo), http.ts (echtes Backend), files.ts (Dateien mit Postausgang)
  utils/                        Datums-Formatierung, Eignungsstufen, IDs (newId)
  styles/base.css               Design-Tokens (CSS-Variablen) und Basisklassen
  components/                   wiederverwendbare Bausteine (AppModal, Badges, DropdownSelect …)
  components/inventory/         Reiter Bestand / Bestellliste + Popups (InventoryWorkspace, Inventur und Material-Reiter)
  views/                        Seiten: Zeitplan, Inventur, Meine Sachen, Verwaltung (Konten, Saison), FAQ
  views/aircraft/               Flugzeug-Reiter: Kanban, Dokumente, Fristen, Mängel/Befunde, Material
  views/inventory/              Popups der Inventur
public/docs/                    Vorschaubilder der Dokumente
docs/backend.md                 Vertrag mit dem Server: Endpunkte, Datensätze, Konflikte, Rechte
```

## Konventionen

- **Sprache:** Oberfläche, Kommentare und Commit-Nachrichten auf Deutsch; Bezeichner im Code auf Englisch.
- **Zustand nur über den Store ändern.** Neue Aktionen gehören in `store.ts`, nicht in Komponenten – auch kein `v-model` direkt auf Store-Objekte. Aktionen sind synchron und ändern nur `state`; was sich geändert hat, findet `sync.ts` selbst heraus. Neue Datensätze bekommen ihre ID über `newId()`. Änderungen an Kanban-Karten, Mängeln, Bestellungen, Artikeln und Werkstatttagen schreiben einen Eintrag in `history`; Freitext (Kommentare) wird beim Verlassen des Felds gespeichert, nicht pro Tastendruck.
- **Rollen:** Admin, Werkstattleiter, Mitglied, nicht eingetragen (nur ansehen). Mitglieder geben nur Vor- und Nachnamen ein (`enterName`, ohne Passwort; gleicher Name = dasselbe Konto); Sonderkonten (Admin, Werkstattleiter, Werkstatt-Tablet, siehe `needsPassword`) melden sich mit E-Mail und Passwort an (`login`). `currentUser()` liefert ein Sonderkonto nur nach der Anmeldung. Rechte nur über `can('edit' | 'lead' | 'admin')` aus dem Store prüfen, nie über die Rolle direkt. `edit` = alle Angemeldeten, `lead` = abzeichnen und Werkstatttage planen (Werkstattleiter und Admins, auf den Flugzeugseiten gleich), `admin` = Verwaltung (Konten, Saison, Flugzeuge, Vorlagen) und Werkstattzeiträume, nur Admins. Ohne Recht wird ein Bedienelement ausgeblendet oder als Text angezeigt, nicht nur deaktiviert.
- **Personen sind Konto-IDs** (`UserId`) in allen Feldern (`who`, `doneBy`, `owner` …); angezeigt wird über `userName()`. Entfernte Konten bleiben mit `removed` erhalten, damit der Verlauf lesbar bleibt. `SYSTEM` steht für Einträge aus Vereinsflieger.
- **Bearbeiten/Löschen** im Popup-Kopf über `#tools` (Stift, Mülleimer), Löschen immer mit `ConfirmModal`. Formulare zum Anlegen und Bearbeiten sind dieselbe Komponente (`TaskFormModal`, `DefectFormModal`, `ItemFormModal`).
- **Speichern und Konflikte:** `sync.ts` vergleicht nach jeder Aktion den Zustand mit dem bekannten Stand (`records.ts`) und stellt die geänderten Datensätze als eine Sendung in die Warteschlange (im Gerätespeicher, geht offline später raus). Der Server meldet neue Stände; dann wird neu geladen und die eigenen wartenden Änderungen kommen obendrauf. `applyRemote` gleicht dabei per ID ab, damit offene Popups ihre Objekte behalten. Lehnt der Server ab (Konflikt, keine Berechtigung), erscheint eine Meldung (`notify`) und der Server-Stand gilt. Formulare mit Speichern-Button zeigen per `useChangedElsewhere` + `ConflictNote`, wenn jemand anderes denselben Datensatz geändert hat. Was nur der Server kann (Anmelden, Vereinsflieger, Passwort-Link), läuft über `backend` und wirft ohne Verbindung. In der Demo simuliert „Offline testen“ unten links den Verbindungsabbruch; ein zweiter Tab spielt ein zweites Gerät (eigene Warteschlange im sessionStorage).
- **Datenmodell geändert?** `MODEL_VERSION` in `api/records.ts` hochzählen, sonst laden Browser alte, inkompatible Stände und Warteschlangen. Neue Sammlungen dort in `LISTS`/`SINGLES` eintragen und in `docs/backend.md` nachziehen.
- **Alle Flugzeuge haben denselben Inhalt wie die ASG32.** `initialState()` kopiert die ASG32-Datensätze pro Flugzeug mit eigenen IDs (`<flugzeug>-<id>`). Neue Datensätze für ein Flugzeug daher in den ASG32-Listen pflegen. Die Kanban-Vorlagen (`templates`) entstehen aus den ASG32-Karten und gelten für alle Flugzeuge; die Saison 2025/26 im Archiv wird daraus generiert (`previousSeason`).
- **Inventur und Material-Reiter teilen sich die Daten.** Der Material-Reiter filtert nur (`fitsAircraft`, `order.forWhat === type`).
- **Popups** immer über `AppModal` (Escape, Klick daneben, Bottom-Sheet auf dem Handy). Aufbau: blauer Kopf mit Typ-Symbol (`icon`), Titel, `subtitle` und Status-Chips (`#status`, Klassen `pill pill-…`); Inhalt mit eingeklapptem `HistoryList` am Ende; die Hauptaktion steht immer in der Fußleiste (`#footer` rechts, Info in `#meta` links), nie im Inhalt. Popover, die aus scrollbaren Bereichen herausragen müssen, per `<Teleport to="body">`.
- **Farben und Abstände** über die CSS-Variablen aus `base.css`, keine neuen Hex-Werte in Komponenten, wenn es ein Token gibt.
- **Responsiv:** Breakpoints `900px` (Seitenleiste wird Menü, Tabellen werden Karten) und `640px` (Handy). Neue Seiten in beiden Breiten prüfen.
- **Statische Assets:** Bilder in Templates per `import` aus `src/assets` einbinden; dynamische Pfade (z. B. Dokument-Vorschauen) relativ ohne führenden `/`, weil `base: './'` gilt.
- **Dateien** (Fotos, Dokumente) laufen über `src/api/files.ts`: Datensätze speichern nur eine `FileRef`, den Inhalt liefern `uploadFile` / `fileUrl` / `downloadFile`. Neue Dateien liegen zuerst in IndexedDB des Geräts und in einem Postausgang, der vor jeder Sendung hochgeladen wird (`flushFiles`); in der Demo ist IndexedDB selbst der Speicher. Fotos werden vor dem Hochladen verkleinert (`compressImage`); Fotos der Beispieldaten haben keine Datei und erscheinen als Platzhalter.
- **Demo-Teile** (Testkonten im Login-Popup, „Demo zurücksetzen“, „Offline testen“) nur mit `DEMO` aus `api/backend.ts` zeigen. Die Demo prüft kein Passwort und verschickt keine E-Mails. Die Sitzung hält der Server; das Gerät merkt sich die zuletzt bekannte unter eigenem localStorage-Schlüssel, sie übersteht „Demo zurücksetzen“.

## Produkt-Entscheidungen aus dem Feedback

- „Meine Sachen“ (nur für Personen, nicht am Tablet): eigene Karten in Arbeit, zugewiesene Mängel/Befunde, eigene offene Bestellungen und Befunde; für Werkstattleitung und Admins zusätzlich alle erledigten Karten, die auf Abzeichnung warten. Links öffnen die Popups direkt (`?paket=`, `?befund=`, `?artikel=`, `?bestellung=`).
- Startseite ist der Zeitplan; gearbeitet wird nur samstags.
- Der Reiter heißt „Kanban“, ein Eintrag „Kanban-Karte“ (auch bei Mängeln/Befunden); im Code bleibt es `Task`.
- Konten: Der Link geht nur an Vereinsmitglieder, daher kein Vereinscode. Sonderkonten setzen ihr Passwort über einen Link per E-Mail (`#/passwort?token=…`); Admins können ihn in der Verwaltung erneut schicken. Jede Aktion braucht einen Namen; Mitglieder geben beim ersten Öffnen Vor- und Nachnamen ein (Pflicht, keine Namensliste), nur Sonderkonten haben ein Passwort. Was am Tablet passiert, steht als „Werkstatt-Tablet“ im Verlauf; die App ermuntert, das eigene Handy zu nehmen.
- Keine Helfer-Zuteilung bei Arbeitspaketen; wer startet, ergibt sich aus dem angemeldeten Konto und steht nur im Verlauf. Das Werkstatt-Tablet ist ein eigenes Konto (Gerät, Rolle Werkstattleiter); Namen der Helfer werden dort nicht abgefragt.
- Abzeichnen: als angemeldete Person, am Werkstatt-Tablet als Werkstattleitung des Tages. Abgezeichnete Karten sind gesperrt, bis die Werkstattleitung die Abzeichnung zurücknimmt.
- Kanban-Karten haben Notizen mit Fotos (`notes`), z. B. was beim Arbeiten aufgefallen ist. Eigene Notizen darf man löschen, die Werkstattleitung alle; nach dem Abzeichnen ist auch das gesperrt. Die Karte zeigt die Anzahl.
- Eine erledigte Kanban-Karte schließt den verknüpften Mangel/Befund nicht automatisch. „Kanban-Karte erstellen“ am Mangel/Befund öffnet das Formular vorausgefüllt.
- Vereinsflieger-Abgleich (läuft auf dem Server, `syncVereinsflieger` stößt ihn an; in der Demo simuliert): Mängel, Fristen und Verwaltung zeigen den letzten Abgleich, Fehler und „Jetzt abgleichen“ (`VereinsfliegerStatus`). Zugangsdaten gehören auf den Server.
- Mängel aus Vereinsflieger lassen sich in der App nicht bearbeiten oder löschen (nur eigene Befunde). Rückschreiben nach Vereinsflieger kommt als letzter Schritt.
- Flugzeuge pflegen Admins in der Verwaltung (anlegen, bearbeiten, ausmustern, löschen); nichts davon ist fest im Code, damit andere Vereine die App mit eigenem Backend nutzen können. Ausgemusterte Flugzeuge (`retired`) behalten ihre Daten, fehlen aber in Seitenleiste, Saisonplan und Auswahllisten (`activeAircraft`, `aircraftTypes`). Welche Flugzeuge an einem Samstag in der Werkstatt sind, ergibt sich aus ihren Zeiträumen (`planesOn`); Admins ändern die Zeiträume im Saisonplan über den Stift per Ziehen.
- Saisons: Kanban-Karten entstehen aus Vorlagen (Verwaltung → Kanban-Vorlagen, je Flugzeugtyp oder für alle). „Neue Saison starten“ archiviert Karten, Termine und Werkstattleitungen (nur lesen, `archive`), legt die Karten neu aus den Vorlagen an und verschiebt die Werkstattzeiträume um dieselbe Wochenzahl; offene eigene Karten (ohne `templateId`) können mitgehen. Mängel, Inventur, Bestellungen, Dokumente und Fristen sind nicht saisongebunden. Vorlagen ändern bestehende Karten nicht.
- Dokumente gelten für ein Flugzeug, für alle Flugzeuge eines Typs oder den ganzen Verein (`docsFor`); Art und Ausgabe sind eigene Felder. PDFs öffnen im Viewer, Herunterladen liefert die Originaldatei.
- Arbeitspakete haben keine Bereiche (Rumpf, Fläche …), nur Eignungsstufen.
- Inventur: nur Verbrauchsstoffe oder Ersatzteile (kein „Alle“), „leer“ meldet man durch Bestand 0, Statusanzeigen sind Text, keine Buttons.
- Inventur als Zählliste: eine alphabetische Liste ohne Gruppen nach Bestand, gezählt wird direkt in der Zeile (Stepper bzw. Genug / Fast leer / Leer, beide gleich breit). „Fast leer“ gibt es nur bei Artikeln ohne Stückzahl (`FLAG` in `utils/stock.ts`). Lagerorte sind nur Freitext, nie Gruppen.
- Inventur und Material-Reiter haben zwei Reiter: „Bestand“ und „Bestellliste“ (Zähler = offen zu bestellen). Die Bestellliste ist eine Tabelle über die volle Breite (`OrderTable`), gruppiert nach „Muss bestellt werden“ / „Bestellt“; der Button pro Zeile öffnet das Popup direkt im nächsten Schritt (`start`). Wird die Karte schmaler als die Tabelle, werden die Zeilen per Container-Abfrage zu Karten. `?bestellung=` öffnet den Reiter Bestellliste.
- Der Button „Auf Bestellliste“ ist immer weiß (sekundär).
- Kalender heißt „Werkstatt-Termine“: Flugzeuge sind der Titel eines Samstags, die Werkstattleitung steht als Untertitel ohne Avatar. „Leitung offen“ ist kein Warnstatus (keine gelbe Fläche, kein Warnsymbol).
- Mängel/Befunde-Reiter: Zähler ohne gelbe Markierung (offene Mängel sind Dauerzustand).
- Arbeitspaket ↔ Mangel/Befund: Kanban-Karte zeigt den Ursprung („Befund: …“), Popups verlinken gegenseitig direkt auf den Eintrag (`?befund=` / `?paket=`).
- Kanban: Checklisten-Fortschritt (z. B. 2/4) erst ab „In Arbeit“, nicht bei „Offen“.
- Kanban-Karten: Eignungs-Tag rechts neben dem Titel, darunter die Beschreibung (max. 2 Zeilen); Mindesthöhe, damit Karten ohne Beschreibung keine dünnen Streifen werden.
- Neue Bestellung über den „+“-Button in der Gruppe „Muss bestellt werden“ (gleiches Design wie im Kanban), nicht oben rechts auf der Seite.
- Bestellungen haben Bestelldaten (Händler, Artikelnummer, Link, Gesamtpreis), die beim nächsten Mal vom selben Artikel übernommen werden; wer bestellt hat, ergibt sich aus dem Konto. Gelieferte Bestellungen stehen in der Bestellliste unter „Geliefert“ (Bestellverlauf) mit Summe der Saison.
- Bestellliste: Bei ähnlichem Namen schlägt das Formular dezent „Meinst du …?“ (Textlink unter dem Feld) einen Inventur-Artikel vor, damit die Bestellung dem Artikel zugeordnet wird.
- Tages-Popup im Kalender: Werkstattleitung über den Stift neben dem Namen ändern, dazu ein Kommentarfeld pro Tag. Keine „Abnahme“-Einträge und keine Saisonstart-Tage im Kalender.
- Flugzeug-Seite: Kopf nur mit Typ, Kennzeichen und Pate (`manager`, Konto-ID); der Fortschritt (x von y erledigt) steht im Saisonplan (Gantt-Balken und Popover).
- Checkliste steuert den Status: erster Haken startet, alle Haken melden erledigt, ein entfernter Haken nimmt „Erledigt“ zurück – außer nach dem Abzeichnen.
- Beispieldaten: abgeschlossene Flugzeuge (ASK21, ASK23, Discus-2b) komplett erledigt, ASG32 und LS8 gemischt, Arcus-T noch nichts erledigt (`initialState()`).
