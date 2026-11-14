// npm run password-link -- "<name>": new set-password link for a special account, e.g. when the admin lost the password.
// In the container: docker compose exec app node dist/src/cli.js "<name>"
import { join } from 'node:path'
import { createPasswordToken } from './auth.js'
import { openDb } from './db.js'
import { needsPassword, users } from './state.js'

const name = process.argv.slice(2).join(' ').trim().replace(/\s+/g, ' ').toLowerCase()
if (!name) {
  console.error('Aufruf: npm run password-link -- "<Name des Kontos>"')
  process.exit(1)
}
const db = openDb(join(process.env.DATA_DIR ?? 'data', 'wartung.db'))
const user = users(db).find((u) => !u.removed && needsPassword(u) && u.name.trim().replace(/\s+/g, ' ').toLowerCase() === name)
if (!user) {
  console.error(`Kein Konto mit Passwort namens ${name}`)
  process.exit(1)
}
const token = createPasswordToken(db, user.id, new Date())
const base = (process.env.APP_URL ?? '').replace(/\/$/, '')
console.log(`Link für ${user.name} (7 Tage gültig, ältere Links gelten nicht mehr):`)
console.log(`${base}/#/passwort?token=${encodeURIComponent(token)}`)
