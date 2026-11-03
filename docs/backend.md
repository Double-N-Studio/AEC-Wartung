# Backend contract

What the frontend expects from the server. The frontend side is `src/api/http.ts`; the demo replays the same contract in `src/api/mock.ts`. With `VITE_API_URL=/api` (e.g. in `.env.local`) the app talks to the backend; without it, the demo runs. `npm run dev` proxies `/api` to `http://localhost:3000`.

The frontend assumes the API is on the **same origin** (relative `VITE_API_URL`, cookie session). Serving it from another origin would need CORS with credentials and `SameSite=None` cookies, so the server serves both: the image (`server/Dockerfile`) contains the frontend built with `VITE_API_URL=/api` and serves it from `WEB_DIR` next to `/api`. GitHub Pages keeps the demo.

## Core idea

The whole state (`AppState` in `src/types.ts`) consists of **records**. After every action the device sends the changed records as a whole; the server validates and stores them and increments a global revision `rev`. Other devices learn about the new revision via Server-Sent Events and reload. Business logic (status, history, season rollover) lives in the frontend; the server checks permissions and plausibility.

| Collection | Kind | ID |
|---|---|---|
| `users`, `aircraft`, `tasks`, `templates`, `archive`, `defects`, `deadlines`, `documents`, `inventory`, `orders` | list | the record's `id` |
| `schedule` | keyed by date | `YYYY-MM-DD` |
| `season`, `vereinsflieger` | single value | name of the collection |

- **IDs are assigned by the device** (`newId()` in `src/utils/id.ts`: a UUID, or a random string where `crypto.randomUUID` is unavailable over plain http), so records created offline are final immediately. The server must not rely on any ID format. The demo data uses readable IDs (`asg32`, `an1`); both are just strings.
- History (`history`), checklists and notes live **inside** the record, not in separate collections.
- Return lists in insertion order. The frontend sorts where it matters.
- Dates are local time without a time zone: `YYYY-MM-DD` or `YYYY-MM-DDTHH:mm`.
- When the data model changes, bump `MODEL_VERSION` in `src/api/records.ts`: devices then discard their cached state and their queue.

Storage can be a single table `records(coll, id, value JSON, rev, client_id, updated_by, updated_at)` or one table per collection. The frontend only ever sees JSON.

## Endpoints

All under `VITE_API_URL`, JSON, session via cookie (`credentials: 'include'`). On 5xx or a network error the device retries later; it treats any 4xx as final.

| Method and path | Request | Response |
|---|---|---|
| `GET /state` | – | `200 { rev, state: AppState }`, always all keys; `season` and `vereinsflieger` filled in |
| `POST /changes` | `Batch` (see below) | `200 { rev }` · `409 { error }` conflict · `401` not signed in · `403`/`422 { error }` rejected |
| `GET /events` | – | SSE stream: `event: rev` / `data: 42` on every new revision |
| `GET /session` | – | `200 { userId, auth: 'name' \| 'password' \| null }` |
| `POST /session/name` | `{ name }` | `200 { user }` (account found or created) · `409` name belongs to a special account |
| `POST /session/login` | `{ email, password }` | `200 { user }` · `401` |
| `DELETE /session` | – | `204` |
| `POST /users/:id/password-link` | – | `200 { token }` – new token for the set-password link (admins only) · `404` account unknown |
| `POST /password` | `{ token, password }` | `204` · `400` link expired or already used |
| `PUT /files/:id` | raw body, `Content-Type`, `X-File-Name` (URL-encoded) | `204` · `413` too large |
| `GET /files/:id` | – | the file |
| `POST /vereinsflieger/sync` | – | `202`; the result lands in the records |

Any response other than the listed success codes counts as rejected; if the body is `{ error: string }`, the frontend shows that text.

### Sending changes

```ts
interface Batch {
  id: string          // unique; the same batch may arrive again after a network error
  clientId: string    // device or browser tab
  baseRev: number     // revision the changes were made on
  at: string          // device time, YYYY-MM-DDTHH:mm
  changes: { coll: string; id: string; value: object | null }[]  // null = deleted
}
```

- **All or nothing:** one batch is one action (e.g. "start new season" touches dozens of records). Apply it in one transaction, then `rev + 1`.
- **Retries:** answer an already accepted `id` with `200 { rev }` without applying it again.
- **Conflict (409):** when a record in the batch was last changed at a revision `> baseRev` by a **different** `clientId`. The device then drops the batch, shows a message and reloads. Quick follow-up changes from the same `clientId` are not a conflict. If "last write wins" is preferred, skip the check; the frontend copes with either.
- After the response the device reloads if `rev` jumped by more than 1. Its own change also comes back via SSE and is ignored.
- Batches collected offline arrive in order, each with its old `baseRev`.

### Loading and other devices

`GET /state` returns the complete state (a few hundred records, plus `archive`). The device lays its still-pending batches on top. It reloads on an SSE `rev` greater than its own, after reconnecting, and when the tab becomes visible again. A `GET /changes?since=rev` can be added later without much change on the frontend side (`refresh` in `src/sync.ts`).

`EventSource` reconnects on its own. The server should send a comment line (`: ping`) every ~30 s so proxies don't drop idle streams; nginx on the VPS is configured with `proxy_buffering off` and a long read timeout for `/api`.

## Permissions

The frontend only hides controls (`can()` in `src/store.ts`); the server must check every batch itself by comparing the old and the new record.

| Who | May |
|---|---|
| no session | only `GET /state`, `/events`, `/files/:id`, the session endpoints and `POST /password` |
| everyone signed in (`edit`) | `tasks` (except signing off); create, edit and delete own findings in `defects` (`source: 'befund'`); for defects from Vereinsflieger only `status`, `owner`, `taskId`, `doneAt`, `doneBy`, `history`; `documents`, `inventory`, `orders`; in `schedule` only `comment` and `history` |
| workshop leads and admins (`lead`) | additionally set and remove `signedBy`/`signedAt`, delete other people's notes (`tasks[].notes`), and `leader`, `closed`, `reason` in `schedule` |
| admins (`admin`) | additionally `users`, `season`, `aircraft` (including the workshop period `start`/`end`), `templates`, `archive` |
| server only | `deadlines`, `vereinsflieger`, creating and deleting defects from Vereinsflieger, accounts via `POST /session/name` |

Further rules the server should enforce:

- **Signed-off cards are locked:** if the old record has `signedBy`, only `lead` may change it, and only to remove `signedBy`/`signedAt` plus a history entry.
- **Who and when:** new history entries (`history`, `notes`) carry the signed-in account in `who`. Exception: on the workshop tablet `signedBy` is the workshop lead of the day (`schedule[today].leader`, see `signer()`); if no lead is set for the day, the tablet's own account. Timestamps come from the device and may lie in the past after working offline.
- An admin must not change their own role or mark their own account `removed`.
- **Deleting an aircraft:** the batch only deletes the aircraft, its `tasks` and `documents`. The server then deletes its `defects` (both kinds) and `deadlines` itself, as a revision of its own (`rev + 2` in the response, so the device reloads). Nothing is sent to Vereinsflieger.
- Accounts are never deleted, only marked `removed: true`. Removed accounts can no longer sign in.

## Accounts and sign-in

- **Members** (`role: 'user'`, no `email`): `POST /session/name` with "First Last". Same name (case-insensitive) = same account, otherwise the server creates `{ id, name, role: 'user' }`. If the name belongs to a special account, respond `409`. Afterwards the device reloads so the account appears in `users`.
- **Special accounts** (admin, workshop lead, workshop tablet with `device: true`; rule in `needsPassword`): sign in with e-mail and password. The e-mail is only the sign-in name (unique, case-insensitive): **the server sends no e-mails**, and there is no "forgot password" for now.
- **Setting the password:** an admin gets a token via `POST /users/:id/password-link` (right after creating the account, or later for a new password); the frontend builds the link `<app URL>/#/passwort?token=…` and the admin passes it on. A token works once and for 7 days; a new token makes the account's older ones invalid. `POST /password` sets the password and invalidates the token, but does not end existing sessions. Store only a hash of the token. Passwords (hashed, e.g. scrypt) are never part of `users`.
- The frontend sends a new account's batch before asking for its token; if the account still isn't known, answer `404`.
- Sessions should be long-lived: the tablet stays signed in for the whole season, members enter their name only once.

## Files

Photos and PDFs first go into the device's IndexedDB and an outbox (`src/api/files.ts`). Before every batch the device uploads pending files via `PUT /files/:id`, so a record never points to a file the server doesn't have yet. `PUT` with the same ID may overwrite. Frontend limit: 25 MB (`MAX_FILE_SIZE`); photos are downscaled to 1600 px beforehand. nginx on the VPS allows 30 MB (`client_max_body_size`). The `FileRef` in the record (`id`, `name`, `type`, `size`) is enough to serve the file. When a record is deleted, the server can clean up orphaned files later.

## Vereinsflieger

**Not connected yet** – there is no data from Vereinsflieger for now: no `defects` with `source: 'vf'`, empty `deadlines`, `vereinsflieger: { lastSync: '' }`, and `POST /vereinsflieger/sync` answers `422 { error: 'Vereinsflieger ist noch nicht angebunden' }`. Later:

The server syncs periodically and on `POST /vereinsflieger/sync`, writing the defects (`defects` with `source: 'vf'`, `reportedBy: 'system'`), `deadlines` and `vereinsflieger: { lastSync, error? }`. On failure `lastSync` stays as it was and `error` gets a short text. Credentials live only on the server. Writing back to Vereinsflieger comes later.

## First start

The server needs an initial state: `season` (label, first and last workshop Saturday), `vereinsflieger: { lastSync: '' }`, a first admin account, and empty lists. For the first admin the server prints the set-password link to its log (`APP_URL` from the environment + `/#/passwort?token=…`), since there are no e-mails. Everything else (aircraft, templates, accounts) admins maintain in the app. The demo data lives in `src/mock/data.ts` (`initialState()`) in case it's useful to import for trying things out.
