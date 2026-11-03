// First start: empty state with a season, the Vereinsflieger record and the first admin.
// There are no e-mails, so the admin's set-password link goes to the log.
import { createPasswordToken } from './auth.js'
import type { Db } from './db.js'
import { meta } from './schema.js'
import { bumpRev, listRecords, localDate, putRecord } from './state.js'

export interface SeedEnv {
  ADMIN_NAME?: string
  ADMIN_EMAIL?: string
  APP_URL?: string
  SEASON_LABEL?: string
  SEASON_START?: string
  SEASON_END?: string
}

/** Saturday on or after / on or before the given date (YYYY-MM-DD). */
function saturday(date: string, direction: 1 | -1) {
  const d = new Date(`${date}T12:00:00Z`)
  while (d.getUTCDay() !== 6) d.setUTCDate(d.getUTCDate() + direction)
  return d.toISOString().slice(0, 10)
}

/** Default season: first Saturday of November to the last Saturday of March (the winter we are in or ahead of). */
export function defaultSeason(now: Date) {
  const [y, m] = localDate(now).split('-').map(Number) as [number, number]
  const year = m <= 3 ? y - 1 : y
  return {
    label: `${year}/${String((year + 1) % 100).padStart(2, '0')}`,
    start: saturday(`${year}-11-01`, 1),
    end: saturday(`${year + 1}-03-31`, -1),
  }
}

/**
 * Seeds once there are no accounts yet. Without ADMIN_NAME/ADMIN_EMAIL it only warns and tries again on the next start.
 * Returns the admin's set-password link, if one was created.
 */
export function seed(db: Db, env: SeedEnv, now: Date, log: Pick<Console, 'log' | 'warn'> = console): string | null {
  db.insert(meta).values({ key: 'firstStart', value: now.toISOString() }).onConflictDoNothing().run()
  if (listRecords(db, 'users').length) return null
  const name = env.ADMIN_NAME?.trim()
  const email = env.ADMIN_EMAIL?.trim()
  if (!name || !email) {
    log.warn('Kein Konto vorhanden: ADMIN_NAME und ADMIN_EMAIL setzen (data/app.env) und neu starten, dann steht der Link für den ersten Admin im Log.')
    return null
  }
  const fallback = defaultSeason(now)
  const season = {
    label: env.SEASON_LABEL || fallback.label,
    start: env.SEASON_START || fallback.start,
    end: env.SEASON_END || fallback.end,
  }
  const admin = { id: crypto.randomUUID(), name, role: 'admin', email }
  db.transaction((tx) => {
    const rev = bumpRev(tx)
    const origin = { clientId: null, userId: null, at: now.toISOString() }
    if (!listRecords(tx, 'season').length) putRecord(tx, 'season', 'season', season, rev, origin)
    if (!listRecords(tx, 'vereinsflieger').length) putRecord(tx, 'vereinsflieger', 'vereinsflieger', { lastSync: '' }, rev, origin)
    putRecord(tx, 'users', admin.id, admin, rev, origin)
  })
  const token = createPasswordToken(db, admin.id, now)
  const link = `${(env.APP_URL ?? '').replace(/\/$/, '')}/#/passwort?token=${encodeURIComponent(token)}`
  log.log(`Erster Admin ${name} <${email}> angelegt. Passwort setzen (7 Tage gültig): ${link}`)
  return link
}
