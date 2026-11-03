# Backend-Vertrag

Was das Frontend vom Server erwartet. Die Gegenstelle im Frontend ist `src/api/http.ts`, die Demo spielt denselben Vertrag in `src/api/mock.ts` nach. Mit `VITE_API_URL=/api` (z. B. in `.env.local`) spricht die App mit dem Backend; ohne den Eintrag läuft die Demo. `npm run dev` reicht `/api` an `http://localhost:3000` weiter.

## Grundidee

Der ganze Zustand (`AppState` in `src/types.ts`) besteht aus **Datensätzen**. Das Gerät schickt nach jeder Aktion die geänderten Datensätze als Ganzes, der Server prüft und speichert sie und zählt einen globalen Stand `rev` hoch. Andere Geräte erfahren per Server-Sent Events, dass es einen neuen Stand gibt, und laden neu. Fachlogik (Status, Verlauf, Saisonwechsel) läuft im Frontend; der Server prüft Rechte und Plausibilität.

| Sammlung | Art | ID |
|---|---|---|
| `users`, `aircraft`, `tasks`, `templates`, `archive`, `defects`, `deadlines`, `documents`, `inventory`, `orders` | Liste | `id` des Datensatzes |
| `schedule` | nach Datum | `YYYY-MM-DD` |
| `season`, `vereinsflieger` | Einzelwert | Name der Sammlung |

- **IDs vergibt das Gerät** (`crypto.randomUUID()`), damit offline angelegte Datensätze sofort feststehen. Die Beispieldaten haben lesbare IDs (`asg32`, `an1`); beides sind nur Strings.
- Verlauf (`history`), Checklisten und Notizen stehen **im** Datensatz, nicht getrennt.
- Listen in Einfügereihenfolge zurückgeben. Das Frontend sortiert, wo es darauf ankommt.
- Datumsangaben sind lokale Zeit ohne Zeitzone: `YYYY-MM-DD` oder `YYYY-MM-DDTHH:mm`.
- Ändert sich das Datenmodell, `MODEL_VERSION` in `src/api/records.ts` hochzählen: Geräte verwerfen dann ihren gespeicherten Stand und ihre Warteschlange.

Speichern lässt sich das als eine Tabelle `records(coll, id, value JSON, rev, client_id, updated_by, updated_at)` oder als Tabellen pro Sammlung. Das Frontend sieht nur JSON.

## Endpunkte

Alle unter `VITE_API_URL`, JSON, Sitzung per Cookie (`credentials: 'include'`). Antworten mit 5xx oder Netzfehler versucht das Gerät später erneut; 4xx nimmt es als endgültig.

| Methode und Pfad | Anfrage | Antwort |
|---|---|---|
| `GET /state` | – | `200 { rev, state: AppState }`, immer alle Schlüssel; `season` und `vereinsflieger` ausgefüllt |
| `POST /changes` | `Batch` (siehe unten) | `200 { rev }` · `409 { error }` Konflikt · `401` nicht angemeldet · `403`/`422 { error }` abgelehnt |
| `GET /events` | – | SSE-Strom: `event: rev` / `data: 42` bei jedem neuen Stand |
| `GET /session` | – | `200 { userId, auth: 'name' \| 'password' \| null }` |
| `POST /session/name` | `{ name }` | `200 { user }` (Konto gefunden oder neu angelegt) · `409` Name gehört einem Sonderkonto |
| `POST /session/login` | `{ email, password }` | `200 { user }` · `401` |
| `DELETE /session` | – | `204` |
| `POST /users/:id/password-link` | – | `204` – schickt die E-Mail mit dem Link (nur Admins) |
| `POST /password` | `{ token, password }` | `204` · `400` Link abgelaufen oder schon benutzt |
| `PUT /files/:id` | Rohdaten, `Content-Type`, `X-File-Name` (URL-kodiert) | `204` · `413` zu groß |
| `GET /files/:id` | – | die Datei |
| `POST /vereinsflieger/sync` | – | `202`; Ergebnis landet in den Datensätzen |

### Änderungen senden

```ts
interface Batch {
  id: string          // eindeutig; dieselbe Sendung kann nach einem Netzfehler erneut kommen
  clientId: string    // Gerät bzw. Browser-Tab
  baseRev: number     // Stand, auf dem die Änderungen gemacht wurden
  at: string
  changes: { coll: string; id: string; value: object | null }[]  // null = gelöscht
}
```

- **Ganz oder gar nicht:** Eine Sendung ist eine Aktion (z. B. „Neue Saison starten“ ändert Dutzende Datensätze). In einer Transaktion anwenden, danach `rev + 1`.
- **Wiederholungen:** Eine bereits angenommene `id` mit `200 { rev }` beantworten, ohne erneut anzuwenden.
- **Konflikt (409):** Wenn ein Datensatz der Sendung zuletzt bei einem Stand `> baseRev` von einer **anderen** `clientId` geändert wurde. Das Gerät verwirft dann die Sendung, zeigt eine Meldung und lädt neu. Eigene schnelle Folgeänderungen (gleiche `clientId`) sind kein Konflikt. Wer lieber „letzter gewinnt“ will, lässt die Prüfung weg; das Frontend kommt mit beidem zurecht.
- Nach der Antwort lädt das Gerät neu, wenn `rev` um mehr als 1 gesprungen ist. Die eigene Änderung kommt per SSE zurück und wird ignoriert.
- Offline gesammelte Sendungen kommen der Reihe nach, jede mit ihrem alten `baseRev`.

### Laden und andere Geräte

`GET /state` liefert den kompletten Stand (wenige hundert Datensätze, plus `archive`). Das Gerät legt seine noch wartenden Sendungen darüber. Es lädt neu bei einem SSE-`rev` größer als seinem eigenen, nach dem Wiederverbinden und wenn der Tab wieder sichtbar wird. Ein `GET /changes?since=rev` lässt sich später ergänzen, ohne dass sich am Frontend viel ändert (`refresh` in `src/sync.ts`).

## Rechte

Das Frontend blendet nur Bedienelemente aus (`can()` in `src/store.ts`); der Server muss jede Sendung selbst prüfen, indem er alten und neuen Datensatz vergleicht.

| Wer | Darf |
|---|---|
| ohne Sitzung | nur `GET /state`, `/events`, `/files/:id`, die Sitzungs-Endpunkte und `POST /password` |
| alle Angemeldeten (`edit`) | `tasks` (außer Abzeichnen), eigene Befunde in `defects` (`source: 'befund'`) anlegen, ändern, löschen; bei Mängeln aus Vereinsflieger nur `status`, `owner`, `taskId`, `doneAt`, `doneBy`, `history`; `documents`, `inventory`, `orders`; in `schedule` nur `comment` und `history` |
| Werkstattleiter und Admins (`lead`) | zusätzlich `signedBy`/`signedAt` setzen und entfernen, fremde Notizen (`tasks[].notes`) löschen, in `schedule` `leader`, `closed`, `reason` |
| Admins (`admin`) | zusätzlich `users`, `season`, `aircraft` (auch Werkstattzeitraum `start`/`end`), `templates`, `archive` |
| nur der Server | `deadlines`, `vereinsflieger`, Mängel aus Vereinsflieger anlegen und löschen, Konten über `POST /session/name` |

Weitere Regeln, die der Server durchsetzen sollte:

- **Abgezeichnete Karten sind gesperrt:** Hat der alte Datensatz `signedBy`, darf nur `lead` ändern, und zwar nur `signedBy`/`signedAt` entfernen plus Verlauf.
- **Wer und wann:** Neue Verlaufseinträge (`history`, `notes`) tragen in `who` das angemeldete Konto. Ausnahme: Am Werkstatt-Tablet steht in `signedBy` die Werkstattleitung des Tages (`schedule[heute].leader`, siehe `signer()`). Die Zeit kommt vom Gerät und darf nach dem Offline-Arbeiten zurückliegen.
- Die eigene Rolle darf ein Admin nicht ändern, die eigene Sitzung nicht entfernen (`removed`).
- Konten werden nie gelöscht, nur mit `removed: true` markiert. Entfernte Konten können sich nicht mehr anmelden.

## Konten und Anmeldung

- **Mitglieder** (`role: 'user'`, kein `email`): `POST /session/name` mit „Vorname Nachname“. Gleicher Name (ohne Groß/Klein) = dasselbe Konto, sonst legt der Server `{ id, name, role: 'user' }` an. Gehört der Name einem Sonderkonto, kommt `409`. Danach lädt das Gerät neu, damit das Konto in `users` steht.
- **Sonderkonten** (Admin, Werkstattleiter, Werkstatt-Tablet mit `device: true`; Regel in `needsPassword`): Anmeldung mit E-Mail und Passwort. Legt ein Admin ein Sonderkonto an (Datensatz in `users` mit `email`), schickt der Server von sich aus die E-Mail mit dem Link `<App-URL>/#/passwort?token=…`. „Link zum Passwort-Setzen senden“ in der Verwaltung ruft `password-link` erneut auf. Passwörter stehen nie in `users`.
- Die Sitzung sollte lange halten: Das Tablet bleibt die ganze Saison angemeldet, Mitglieder geben ihren Namen nur einmal ein.

## Dateien

Fotos und PDFs landen zuerst in IndexedDB des Geräts und in einem Postausgang (`src/api/files.ts`). Vor jeder Sendung lädt das Gerät offene Dateien per `PUT /files/:id` hoch; ein Datensatz zeigt also nie auf eine Datei, die der Server noch nicht hat. `PUT` mit derselben ID darf überschreiben. Grenze im Frontend: 25 MB (`MAX_FILE_SIZE`), Fotos werden vorher auf 1600 px verkleinert. Die `FileRef` im Datensatz (`id`, `name`, `type`, `size`) reicht zum Ausliefern. Wird ein Datensatz gelöscht, kann der Server verwaiste Dateien später aufräumen.

## Vereinsflieger

Der Server gleicht regelmäßig und auf `POST /vereinsflieger/sync` ab und schreibt dabei die Mängel (`defects` mit `source: 'vf'`, `reportedBy: 'system'`), `deadlines` und `vereinsflieger: { lastSync, error? }`. Bei einem Fehler bleibt `lastSync` stehen und `error` bekommt einen kurzen Text. Die Zugangsdaten liegen nur auf dem Server. Zurückschreiben nach Vereinsflieger kommt später.

## Erster Start

Der Server braucht einen Ausgangsstand: `season` (Bezeichnung, erster und letzter Werkstatt-Samstag), `vereinsflieger: { lastSync: '' }`, ein erstes Admin-Konto mit Link zum Passwort-Setzen und leere Listen. Alles Weitere (Flugzeuge, Vorlagen, Konten) pflegen Admins in der App. Die Beispieldaten der Demo stehen in `src/mock/data.ts` (`initialState()`), falls man sie zum Ausprobieren importieren will.
