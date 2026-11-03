// Backend entry point. nginx on the VPS forwards https://wartung.… to this process.
import { serve } from '@hono/node-server'
import { eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { logger } from 'hono/logger'
import { db } from './db.js'
import { meta } from './schema.js'

const app = new Hono()
app.use(logger())

const version = process.env.APP_VERSION ?? 'dev'

app.get('/api/health', (c) => {
  const firstStart = db.select().from(meta).where(eq(meta.key, 'firstStart')).get()
  return c.json({ ok: true, version, firstStart: firstStart?.value ?? null })
})

// Until the frontend is served from here, the root only answers with a note.
app.get('/', (c) => c.text(`Winterwartung Aero-Club Bad Nauheim – Backend ${version}\n`))

app.notFound((c) => c.json({ error: 'Nicht gefunden' }, 404))
app.onError((err, c) => {
  console.error(err)
  return c.json({ error: 'Interner Fehler' }, 500)
})

const port = Number(process.env.PORT ?? 3000)
serve({ fetch: app.fetch, port, hostname: '0.0.0.0' }, () => {
  console.log(`Backend ${version} listening on port ${port}`)
})
