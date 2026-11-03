// All /api routes (contract: docs/backend.md). index.ts adds static files and the port; tests call app.request().
import { eq } from 'drizzle-orm'
import { Hono, type Context } from 'hono'
import { z } from 'zod'
import {
  checkPassword, clientIp, createPasswordToken, endSession, rateLimit, readSession, startSession, usePasswordToken,
} from './auth.js'
import { applyBatch, batchSchema, serverChange } from './changes.js'
import type { Db } from './db.js'
import { createEvents, type Events } from './events.js'
import { getFile, putFile } from './files.js'
import { meta } from './schema.js'
import { getRev, loadState, needsPassword, userById, users, type User } from './state.js'

export interface AppOptions {
  db: Db
  /** Uploaded files go to dataDir/files */
  dataDir: string
  /** Clock, replaceable in tests */
  now?: () => Date
  events?: Events
  version?: string
}

export function createApp({ db, dataDir, now = () => new Date(), events = createEvents(), version = 'dev' }: AppOptions) {
  const app = new Hono().basePath('/api')
  const limiter = rateLimit()

  const session = (c: Context) => readSession(c, db, now())
  /** JSON body, or undefined if it isn't valid for the schema. */
  async function body<T>(c: Context, schema: z.ZodType<T>): Promise<T | undefined> {
    const parsed = schema.safeParse(await c.req.json().catch(() => undefined))
    return parsed.success ? parsed.data : undefined
  }
  /** Rate limit for sign-in and setting passwords (failed attempts per address). */
  const tooMany = (c: Context) =>
    limiter.blocked(clientIp(c), now().getTime()) ? c.json({ error: 'Zu viele Versuche – bitte später noch einmal' }, 429) : null
  const failed = (c: Context) => limiter.fail(clientIp(c), now().getTime())

  app.get('/health', (c) => {
    const firstStart = db.select().from(meta).where(eq(meta.key, 'firstStart')).get()
    return c.json({ ok: true, version, firstStart: firstStart?.value ?? null })
  })

  /* ---------- State and changes ---------- */

  app.get('/state', (c) => {
    // One read transaction, so rev and state belong together.
    const snapshot = db.transaction((tx) => ({ rev: getRev(tx), state: loadState(tx) }))
    return c.json(snapshot)
  })

  app.post('/changes', async (c) => {
    const batch = await body(c, batchSchema)
    if (!batch) return c.json({ error: 'Ungültige Anfrage' }, 400)
    const result = applyBatch(db, batch, session(c), now())
    if (result.status !== 200) return c.json({ error: result.error }, result.status)
    events.publish(result.rev)
    return c.json({ rev: result.rev })
  })

  app.get('/events', (c) => events.stream(c, () => getRev(db)))

  /* ---------- Sign-in ---------- */

  app.get('/session', (c) => {
    const s = session(c)
    return c.json(s ? { userId: s.user.id, auth: s.auth } : { userId: null, auth: null })
  })

  app.post('/session/name', async (c) => {
    const input = await body(c, z.object({ name: z.string() }))
    const name = input?.name.trim().replace(/\s+/g, ' ')
    if (!name) return c.json({ error: 'Bitte Vor- und Nachnamen eingeben' }, 400)
    let user = users(db).find((u) => !u.removed && u.name.toLowerCase() === name.toLowerCase())
    if (user && needsPassword(user)) return c.json({ error: 'Dieses Konto meldet sich mit E-Mail und Passwort an' }, 409)
    if (!user) {
      user = { id: crypto.randomUUID(), name, role: 'user' }
      events.publish(serverChange(db, 'users', user.id, user, now()))
    }
    startSession(c, db, user, 'name', now())
    return c.json({ user })
  })

  app.post('/session/login', async (c) => {
    const blocked = tooMany(c)
    if (blocked) return blocked
    const input = await body(c, z.object({ email: z.string(), password: z.string() }))
    const email = input?.email.trim().toLowerCase()
    const user = email ? users(db).find((u) => !u.removed && needsPassword(u) && u.email?.trim().toLowerCase() === email) : undefined
    if (!user || !checkPassword(db, user.id, input!.password)) {
      failed(c)
      return c.json({ error: 'E-Mail oder Passwort stimmt nicht' }, 401)
    }
    startSession(c, db, user, 'password', now())
    return c.json({ user })
  })

  app.delete('/session', (c) => {
    endSession(c, db)
    return c.body(null, 204)
  })

  /* ---------- Passwords ---------- */

  app.post('/users/:id/password-link', (c) => {
    const s = session(c)
    if (!s) return c.json({ error: 'Nicht angemeldet' }, 401)
    if (s.user.role !== 'admin' || s.auth !== 'password') return c.json({ error: 'Nur für Admins' }, 403)
    const user: User | undefined = userById(db, c.req.param('id'))
    if (!user || user.removed) return c.json({ error: 'Konto nicht gefunden' }, 404)
    if (!needsPassword(user)) return c.json({ error: 'Mitglieder melden sich ohne Passwort an' }, 422)
    return c.json({ token: createPasswordToken(db, user.id, now()) })
  })

  app.post('/password', async (c) => {
    const blocked = tooMany(c)
    if (blocked) return blocked
    const input = await body(c, z.object({ token: z.string(), password: z.string() }))
    if (!input?.token) return c.json({ error: 'Ungültige Anfrage' }, 400)
    if (input.password.length < 8) return c.json({ error: 'Das Passwort braucht mindestens 8 Zeichen' }, 400)
    if (!usePasswordToken(db, input.token, input.password, now())) {
      failed(c)
      return c.json({ error: 'Der Link ist abgelaufen oder wurde schon benutzt' }, 400)
    }
    return c.body(null, 204)
  })

  /* ---------- Files ---------- */

  app.put('/files/:id', (c) => {
    if (!session(c)) return c.json({ error: 'Nicht angemeldet' }, 401)
    return putFile(c, db, dataDir, now())
  })

  app.get('/files/:id', (c) => getFile(c, db, dataDir))

  /* ---------- Vereinsflieger ---------- */

  app.post('/vereinsflieger/sync', (c) => c.json({ error: 'Vereinsflieger ist noch nicht angebunden' }, 422))

  app.notFound((c) => c.json({ error: 'Nicht gefunden' }, 404))
  app.onError((err, c) => {
    console.error(err)
    return c.json({ error: 'Interner Fehler' }, 500)
  })

  return app
}
