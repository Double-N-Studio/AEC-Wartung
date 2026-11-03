// Entry point: API under /api and the built frontend. nginx on the VPS forwards https://wartung.… to this process.
import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
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

// Frontend build (dist/ of the app, built with VITE_API_URL=/api), so app and API share one origin.
// Without WEB_DIR (local development: Vite serves the frontend) the root only answers with a note.
const webDir = process.env.WEB_DIR
if (webDir) {
  const files = serveStatic({
    root: webDir,
    // index.html always fresh, so a deploy arrives at once; Vite gives assets content hashes.
    onFound: (path, c) => {
      c.header('Cache-Control', path.includes('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache')
    },
  })
  app.use('*', (c, next) => (c.req.path.startsWith('/api/') ? next() : files(c, next)))
} else {
  app.get('/', (c) => c.text(`Winterwartung Aero-Club Bad Nauheim – Backend ${version}\n`))
}

app.notFound((c) => c.json({ error: 'Nicht gefunden' }, 404))
app.onError((err, c) => {
  console.error(err)
  return c.json({ error: 'Interner Fehler' }, 500)
})

const port = Number(process.env.PORT ?? 3000)
serve({ fetch: app.fetch, port, hostname: '0.0.0.0' }, () => {
  console.log(`Backend ${version} listening on port ${port}`)
})
