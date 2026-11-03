// Entry point: API under /api and the built frontend. nginx on the VPS forwards https://wartung.… to this process.
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { Hono } from 'hono'
import { logger } from 'hono/logger'
import { createApp } from './app.js'
import { openDb } from './db.js'
import { seed } from './seed.js'

const version = process.env.APP_VERSION ?? 'dev'
const dataDir = process.env.DATA_DIR ?? 'data'
mkdirSync(dataDir, { recursive: true })
const db = openDb(join(dataDir, 'wartung.db'))
seed(db, process.env, new Date())

const app = new Hono()
// The SSE stream stays open for hours; logging it on close would only be noise.
app.use((c, next) => (c.req.path === '/api/events' ? next() : logger()(c, next)))
app.route('/', createApp({ db, dataDir, version }))

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
