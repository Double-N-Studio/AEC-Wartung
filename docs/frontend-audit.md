# Frontend audit before the backend

State: commit `153377e`. Scope: what the UI still lacks to work with real data and real users. Items that are deliberately dead in the mock (download, camera, upload, login) are listed where the backend needs a real UI for them.

Priorities: **P1** blocks the backend or real use · **P2** needed for a real season · **P3** nice to have.

## Status

- **§1–§3 done.** Test-account switcher with four roles (Admin, Werkstattleiter, Mitglied, nicht angemeldet) and read-only mode; people are user IDs; Verwaltung page for accounts and season; closed days and day history; Gantt periods draggable for admins; `planes` derived from periods; inventory items create/edit/delete; edit/delete/undo for Kanban cards, Befunde, orders, documents and the day comment.
- Left as is on purpose: aircraft are fixed; Mängel from Vereinsflieger are not editable in the app; "Delegiert an" (Fristen) stays read-only.
- **Decisions:** the Werkstatt-Tablet stays a user of its own (no helper names); a finished card does not close its Mangel automatically; Vereinsflieger write-back yes, but as the very last step.
- Open from §4: "Kanban-Karte erstellen" from a defect still creates the card silently instead of opening the prefilled form.

## 1. Identity, roles, read-only mode — P1

| Gap | Where |
| --- | --- |
| No login screen, no account menu, no logout. The sidebar always shows "Werkstatt-Tablet · Werkstattleiter". | `AppSidebar.vue`, `mock/people.ts` (`CURRENT_USER`) |
| No read-only mode. The FAQ promises "ohne Login alles ansehen, nichts ändern", but every button, stepper, checkbox and textarea is always active. Needs a `can(…)` helper and disabled/hidden states for guest, Werkstattleiter, Admin. | all views |
| Sign-off identity is hard-coded: `todaysLeader = 'MA'`. Should be the logged-in leader, or on the tablet the day's leader from the schedule (and handle "Leitung offen"). | `TaskModal.vue:20` |
| On the tablet every start/finish is logged as "Werkstatt-Tablet", so `doneBy` never names a helper. Decide: optional name field on start, or accept anonymous tablet entries. | `store.ts` `startTask`/`finishTask` |
| People are inconsistent: `leader` is a `PersonKey`, while `owner`, `who`, `signedBy`, `reportedBy` are free strings. `OWNERS` in `DefectModal.vue` is a separate hard-coded list. Unify on user IDs before designing tables. | `types.ts`, `DefectModal.vue:14` |

## 2. Master data / admin screens — P1

Everything below is currently only editable in `mock/data.ts`.

- **Aircraft:** add, edit (type, reg, serial, sponsor), set workshop period (`start`/`end`). Gantt bars are not editable.
- **Season:** `SEASON_START`, `WEEKS` and `CAL_MONTHS` are constants in `SchedulePage.vue`; "Saison 2026/27" is hard-coded in the sidebar. Needs a season setting and a way to start a new season.
- **Schedule days:** cannot mark a Saturday as closed (Weihnachten/Neujahr), cannot edit the `planes` text. `planes` is a hand-written string instead of being derived from the aircraft periods, so it will drift.
- **People / leaders:** `LEADERS` and `PEOPLE` are constants. Needs user management (Admin) incl. who may lead.
- **Inventory items:** no create, edit (name, location, unit, count vs. flag, fits) or delete. New stuff can only enter as a free order, and delivering a free order does not create an item.

## 3. Edit, delete, undo for existing records — P1

| Record | Missing |
| --- | --- |
| Arbeitspaket | Edit title/description/level/duration/checklist/document; delete; set or change a **Frist** (field exists in the model, not in `NewTaskModal`); move back from "In Arbeit" to "Offen"; tasks without checklist can't be reopened from "Erledigt"; undo sign-off. |
| Mangel/Befund | Edit title/description/priority; add or remove photos later; delete a wrongly created Befund; unlink a task. |
| Bestellung | Cancel/delete; change "Für"; link a free order to an inventory item afterwards; enter the expected delivery date (fixed at +14 days in `markOrdered`); optional supplier/price/who ordered. |
| Dokument | Delete, rename, replace with a new version. |
| Tageskommentar | No history entry, no author. |
| Fristen | "Delegiert an" is read-only (fine if Vereinsflieger stays the source; decide). |

Convention break: the order comment is bound directly with `v-model="order.comment"` (`OrderSection.vue`), bypassing the store and the history. Needs a store action like every other mutation, otherwise it can't be turned into an API call.

## 4. Cross-record consistency rules — P1 (decide, then build)

- Task signed/finished ↔ linked Mangel: nothing happens to the defect. The mock data closes defects with their task (`completeAll`), the store does not. Decide: close automatically, suggest closing, or leave manual.
- Defect marked done while its task is still open: no warning.
- "Arbeitspaket erstellen" from a defect creates the task silently with `level: 'erf'`, `~1 h` and no checklist — it should open `NewTaskModal` prefilled so the leader can adjust it.
- Delivered free orders vanish without updating any stock.

## 5. Async, errors, feedback — P1

The store is fully synchronous and in-memory. Before swapping in an API:

- Async actions with pending state (buttons disabled/spinner while saving), especially for the inline steppers in the inventory count list.
- Error handling: no toast/notification component exists; failed saves need a visible message and rollback of optimistic updates.
- Loading and empty states for every page (skeletons on first load; "Flugzeug nicht gefunden" exists, nothing else).
- Unknown `?paket=` / `?befund=` ids are ignored silently.
- Concurrent edits (tablet + home browser): at minimum refresh on focus or polling; decide whether last-write-wins is acceptable.
- Confirmation dialogs inside `AppModal` for destructive actions (only `window.confirm` for "Demo zurücksetzen" today).
- Replace "Demo zurücksetzen" and the `localStorage` persistence once the API exists.

## 6. Files and photos — P1/P2

- Document upload is simulated (`form.file = true`, fake `Scan_2027-01-16.pdf`). Needs a real `<input type="file" accept="application/pdf">`, size limit, progress, errors.
- Viewer shows a PNG preview only. Real PDFs need a viewer (or open in new tab) and a working "Herunterladen".
- Befund photos are a counter (`photos: number`), shown as placeholders. Needs `<input type="file" accept="image/*" capture="environment">`, thumbnails, a lightbox, client-side resize before upload.

## 7. Time and dates — P1

- `TODAY`/`NOW` are fixed to 16.01.2027 (`utils/date.ts`). Replace with the real clock; check everything that compares against `TODAY` (Gantt status, "Heute" marker, deadline warnings, one-count-per-day merge in `logCount`).
- Gantt and calendar range should come from the season, not constants.
- The calendar opens on a hard-coded month (`monthIdx = ref(1)`, January) instead of the current one.

## 8. Vereinsflieger integration UI — P2

- Show last sync time and sync errors on Fristen and Mängel/Befunde ("automatisch übernommen" is static text).
- Decide whether closing a VF-Mangel in the app writes back to Vereinsflieger; if not, show that it must be closed there too.
- Manual "Jetzt synchronisieren" for admins.

## 9. Workflow features for a real season — P2

- **Task templates / copy from last season:** every aircraft currently gets a copy of the ASG32 list via `initialState()`. In reality, the standard Winterwartung list per type needs a template or "aus Vorjahr übernehmen".
- **Sign-off queue:** a list of all "Abzeichnung offen" tasks across aircraft for the day's leader, ideally with multi-select sign-off.
- **Delivered orders:** "Geliefert" has no view; README promises "muss bestellt werden → bestellt → geliefert". Add a collapsed "Geliefert" group or history.
- **Season close / archive:** past seasons and completed aircraft read-only, starting a new season.
- **Deadline ↔ task link:** a Frist can't spawn an Arbeitspaket (e.g. Lufttüchtigkeitsprüfung).

## 10. Polish — P3

- Search on the Kanban board and the defect list (inventory has search).
- Deep links for inventory items, orders and calendar days (only tasks/defects have `?paket=`/`?befund=`).
- `AppModal`: focus trap and focus return to the trigger; Escape closes nested popovers first.
- Form validation beyond "title not empty" (max lengths, trimmed duplicates).
- Leader dropdown closes on blur before a touch selection on some tablets — check on the real device.
- PWA/offline (planned in README): install prompt, offline banner, queued writes. Large enough to be its own project; design the async layer (§5) with it in mind.
- Dead code once all aircraft have details: `hasDetails` branch in `AppSidebar.vue`.

## Suggested order

1. Decide the open product questions: §1 tablet identity, §4 task ↔ defect rules, §8 VF write-back.
2. Clean up the data model (§1 user IDs, photos/files as references, UUIDs instead of `counter`) and route every mutation through the store (§3 order comment).
3. Build the role/read-only layer and async/error handling against the existing mock store (§1, §5) — this is the seam the API plugs into.
4. Admin screens and edit/delete (§2, §3), real clock (§7), real file inputs (§6).
5. Then backend; §8–§10 alongside.
