# CLAUDE.md

Notes for working on this repo.

## What this is

Web app for the winter maintenance of the club gliders of Aero-Club Bad Nauheim.
The frontend is ready for a backend (contract in `docs/backend.md`, server scaffold in `server/`). Without `VITE_API_URL` it runs as a **demo** against a fake server in the browser – that's what's on GitHub Pages as a clickable preview for the board.
In the demo all data is sample data; "today" is fixed to **2027-01-16** (`VITE_DEMO_DATE` in `.env`). Without that entry the real date applies. In code always use `today()` / `now()` from `src/utils/date.ts`, never `new Date()` directly.

## Commands

```bash
npm install        # dependencies
npm run dev        # dev server (http://localhost:5173)
npm run build      # type check (vue-tsc) + production build to dist/
npm run preview    # view the build locally
```

Against the local backend: `VITE_API_URL=/api` in `.env.local`; the dev server proxies `/api` to port 3000.

Run `npm run build` before every commit – there are no tests, the type check is the check.

## Stack

- Vue 3 with `<script setup lang="ts">`, Vue Router (hash mode), Vite, TypeScript (pinned to 5.9 because `vue-tsc` doesn't support TS 7 yet)
- No UI framework, no state library: own CSS and a reactive store
- Deployment: GitHub Pages via `.github/workflows/deploy.yml` on push to `main`; backend via `.github/workflows/deploy-server.yml` (see `server/README.md`)

## Structure

```
src/
  main.ts, App.vue, router.ts   entry, layout (sidebar / mobile menu), routes
  store.ts                      shared state + all actions, sign-in, startup (boot)
  sync.ts                       sync with the server: detect changes, queue, reload, conflicts
  notify.ts                     short messages (AppToasts), e.g. rejected changes
  types.ts                      data model
  mock/data.ts                  initial data (initialState)
  mock/people.ts                test accounts (people + workshop tablet), role labels
  api/                          backend.ts (interface, picks demo or server), records.ts (state as records),
                                mock.ts (fake server of the demo), http.ts (real backend), files.ts (files with outbox)
  utils/                        date formatting, skill levels, IDs (newId)
  styles/base.css               design tokens (CSS variables) and base classes
  components/                   reusable building blocks (AppModal, badges, DropdownSelect …)
  components/inventory/         tabs stock / order list + popups (InventoryWorkspace, inventory and material tab)
  views/                        pages: schedule, inventory, my stuff, admin (accounts, season), FAQ
  views/aircraft/               aircraft tabs: kanban, documents, deadlines, defects/findings, material
  views/inventory/              popups of the inventory
public/docs/                    preview images of the documents
docs/backend.md                 contract with the server: endpoints, records, conflicts, permissions
server/                         backend (Hono + SQLite), Docker image, VPS notes
```

## Conventions

- **Language:** the UI is German (it's a German club app) – all user-facing text, labels, messages and history entries stay German. Identifiers, comments, docs and commit messages are English. Commit messages are lowercase. Only `README.md` stays German.
- **Change state only through the store.** New actions belong in `store.ts`, not in components – no `v-model` directly on store objects either. Actions are synchronous and only change `state`; `sync.ts` works out what changed. New records get their ID from `newId()`. Changes to kanban cards, defects, orders, items and workshop days write an entry to `history`; free text (comments) is saved on leaving the field, not per keystroke.
- **Roles:** admin, workshop lead, member, not registered (view only). Members only enter first and last name (`enterName`, no password; same name = same account); special accounts (admin, workshop lead, workshop tablet, see `needsPassword`) sign in with e-mail and password (`login`). `currentUser()` returns a special account only after sign-in. Check permissions only via `can('edit' | 'lead' | 'admin')` from the store, never via the role directly. `edit` = everyone signed in, `lead` = sign off and plan workshop days (workshop leads and admins, same on the aircraft pages), `admin` = administration (accounts, season, aircraft, templates) and workshop periods, admins only. Without permission a control is hidden or shown as text, not just disabled.
- **People are account IDs** (`UserId`) in all fields (`who`, `doneBy`, `owner` …); displayed via `userName()`. Removed accounts are kept with `removed` so history stays readable. `SYSTEM` stands for entries from Vereinsflieger.
- **Edit/delete** in the popup header via `#tools` (pencil, trash), delete always with `ConfirmModal`. Create and edit forms are the same component (`TaskFormModal`, `DefectFormModal`, `ItemFormModal`).
- **Saving and conflicts:** after every action `sync.ts` compares the state with the known revision (`records.ts`) and queues the changed records as one batch (in device storage, sent later when offline). The server announces new revisions; the state is then reloaded and own pending changes go on top. `applyRemote` merges by ID so open popups keep their objects. If the server rejects (conflict, no permission), a message appears (`notify`) and the server state wins. Forms with a save button show via `useChangedElsewhere` + `ConflictNote` when someone else changed the same record. What only the server can do (sign-in, Vereinsflieger, password link) goes through `backend` and throws without a connection. In the demo "Offline testen" bottom left simulates losing the connection; a second tab plays a second device (own queue in sessionStorage).
- **Data model changed?** Bump `MODEL_VERSION` in `api/records.ts`, otherwise browsers load old, incompatible states and queues. Register new collections there in `LISTS`/`SINGLES` and update `docs/backend.md`.
- **All aircraft have the same content as the ASG32.** `initialState()` copies the ASG32 records per aircraft with own IDs (`<aircraft>-<id>`). So maintain new records for an aircraft in the ASG32 lists. The kanban templates (`templates`) are derived from the ASG32 cards and apply to all aircraft; the 2025/26 season in the archive is generated from them (`previousSeason`).
- **Inventory and material tab share the data.** The material tab only filters (`fitsAircraft`, `order.forWhat === type`).
- **Popups** always via `AppModal` (Escape, click outside, bottom sheet on mobile). Layout: blue header with type icon (`icon`), title, `subtitle` and status chips (`#status`, classes `pill pill-…`); content with collapsed `HistoryList` at the end; the main action is always in the footer (`#footer` right, info in `#meta` left), never in the content. Popovers that must stick out of scrollable areas go through `<Teleport to="body">`.
- **Colors and spacing** via the CSS variables from `base.css`, no new hex values in components when a token exists.
- **Responsive:** breakpoints `900px` (sidebar becomes a menu, tables become cards) and `640px` (phone). Check new pages at both widths.
- **Static assets:** include images in templates via `import` from `src/assets`; dynamic paths (e.g. document previews) relative without a leading `/`, because `base: './'` applies.
- **Files** (photos, documents) go through `src/api/files.ts`: records only store a `FileRef`, the content comes from `uploadFile` / `fileUrl` / `downloadFile`. New files first live in the device's IndexedDB and an outbox that is uploaded before every batch (`flushFiles`); in the demo IndexedDB itself is the storage. Photos are downscaled before upload (`compressImage`); photos in the sample data have no file and appear as placeholders.
- **Demo parts** (test accounts in the login popup, "Demo zurücksetzen", "Offline testen") only show with `DEMO` from `api/backend.ts`. The demo checks no password and sends no e-mails. The server holds the session; the device remembers the last known one under its own localStorage key, which survives "Demo zurücksetzen".

## Product decisions from feedback

- "Meine Sachen" (only for people, not on the tablet): own cards in progress, assigned defects/findings, own open orders and findings; for workshop leads and admins additionally all finished cards waiting for sign-off. Links open the popups directly (`?paket=`, `?befund=`, `?artikel=`, `?bestellung=`).
- The start page is the schedule; work happens only on Saturdays.
- The tab is called "Kanban", an entry "Kanban-Karte" (also for defects/findings); in code it stays `Task`.
- Accounts: the link only goes to club members, so no club code. Special accounts set their password via an e-mail link (`#/passwort?token=…`); admins can resend it in the admin area. Every action needs a name; members enter first and last name on first open (required, no name list), only special accounts have a password. What happens on the tablet shows as "Werkstatt-Tablet" in the history; the app encourages using your own phone.
- No helper assignment on work packages; who starts follows from the signed-in account and only appears in the history. The workshop tablet is its own account (device, role workshop lead); helpers' names aren't asked for there.
- Sign-off: as the signed-in person, on the workshop tablet as the workshop lead of the day. Signed-off cards are locked until the workshop lead withdraws the sign-off.
- Kanban cards have notes with photos (`notes`), e.g. what came up while working. Own notes can be deleted, workshop leads can delete all; after sign-off that's locked too. The card shows the count.
- A finished kanban card doesn't close the linked defect/finding automatically. "Kanban-Karte erstellen" on a defect/finding opens the form prefilled.
- Vereinsflieger sync (runs on the server, `syncVereinsflieger` triggers it; simulated in the demo): defects, deadlines and admin show the last sync, errors and "Jetzt abgleichen" (`VereinsfliegerStatus`). Credentials belong on the server.
- Defects from Vereinsflieger can't be edited or deleted in the app (only own findings). Writing back to Vereinsflieger comes as the last step.
- Admins maintain aircraft in the admin area (create, edit, retire, delete); none of it is hard-coded so other clubs can use the app with their own backend. Retired aircraft (`retired`) keep their data but are missing from sidebar, season plan and pick lists (`activeAircraft`, `aircraftTypes`). Which aircraft are in the workshop on a Saturday follows from their periods (`planesOn`); admins change the periods in the season plan via the pencil by dragging.
- Seasons: kanban cards are created from templates (admin → Kanban-Vorlagen, per aircraft type or for all). "Neue Saison starten" archives cards, dates and workshop leads (read-only, `archive`), recreates the cards from the templates and shifts the workshop periods by the same number of weeks; open own cards (without `templateId`) can carry over. Defects, inventory, orders, documents and deadlines aren't bound to a season. Templates don't change existing cards.
- Documents apply to one aircraft, all aircraft of a type, or the whole club (`docsFor`); kind and edition are separate fields. PDFs open in the viewer, download delivers the original file.
- Work packages have no areas (fuselage, wing …), only skill levels.
- Inventory: only consumables or spare parts (no "Alle"), "empty" is reported via stock 0, status displays are text, not buttons.
- Inventory as a count list: one alphabetical list without groups by stock, counting happens directly in the row (stepper, or Genug / Fast leer / Leer, both equally wide). "Fast leer" only exists for items without a quantity (`FLAG` in `utils/stock.ts`). Storage locations are free text only, never groups.
- Inventory and material tab have two tabs: "Bestand" and "Bestellliste" (counter = open to order). The order list is a full-width table (`OrderTable`), grouped by "Muss bestellt werden" / "Bestellt"; the button per row opens the popup directly at the next step (`start`). When the card gets narrower than the table, rows become cards via container query. `?bestellung=` opens the order list tab.
- The "Auf Bestellliste" button is always white (secondary).
- The calendar is called "Werkstatt-Termine": aircraft are the title of a Saturday, the workshop lead is the subtitle without avatar. "Leitung offen" is not a warning state (no yellow area, no warning icon).
- Defects/findings tab: counter without yellow highlight (open defects are a permanent state).
- Work package ↔ defect/finding: the kanban card shows the origin ("Befund: …"), popups link to each other directly (`?befund=` / `?paket=`).
- Kanban: checklist progress (e.g. 2/4) only from "In Arbeit" on, not at "Offen".
- Kanban cards: skill tag to the right of the title, description below (max. 2 lines); minimum height so cards without a description don't become thin strips.
- New order via the "+" button in the "Muss bestellt werden" group (same design as in the kanban), not top right on the page.
- Orders have order details (vendor, part number, link, total price) that are carried over next time from the same item; who ordered follows from the account. Delivered orders appear in the order list under "Geliefert" (order history) with the season total.
- Order list: on a similar name the form subtly suggests an inventory item ("Meinst du …?", text link below the field) so the order gets linked to the item.
- Day popup in the calendar: change the workshop lead via the pencil next to the name, plus a comment field per day. No "Abnahme" entries and no season start days in the calendar.
- Aircraft page: header only with type, registration and manager (`manager`, account ID); progress (x of y done) is in the season plan (Gantt bar and popover).
- The checklist drives the status: the first tick starts, all ticks report done, an unticked box takes back "Erledigt" – except after sign-off.
- Sample data: finished aircraft (ASK21, ASK23, Discus-2b) completely done, ASG32 and LS8 mixed, Arcus-T nothing done yet (`initialState()`).
