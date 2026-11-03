// Photos and documents: content under DATA_DIR/files/<id>, name/type/size in the `files` table.
import { createReadStream, existsSync } from 'node:fs'
import { mkdir, rename, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { Readable } from 'node:stream'
import { eq } from 'drizzle-orm'
import type { Context } from 'hono'
import type { Db } from './db.js'
import { files } from './schema.js'

/** Same limit as the frontend (MAX_FILE_SIZE); nginx allows 30 MB. */
export const MAX_FILE_SIZE = 25 * 1024 * 1024
const ID = /^[A-Za-z0-9_-]{1,64}$/

const decode = (s: string | undefined) => {
  try {
    return s ? decodeURIComponent(s) : ''
  } catch {
    return s ?? ''
  }
}

export async function putFile(c: Context, db: Db, dataDir: string, now: Date): Promise<Response> {
  const id = c.req.param('id') ?? ''
  if (!ID.test(id)) return c.json({ error: 'Ungültige Datei-ID' }, 400)
  const tooLarge = () => c.json({ error: 'Datei ist zu groß (höchstens 25 MB)' }, 413)
  if (Number(c.req.header('content-length') ?? 0) > MAX_FILE_SIZE) return tooLarge()
  const body = Buffer.from(await c.req.arrayBuffer())
  if (body.length > MAX_FILE_SIZE) return tooLarge()

  const dir = join(dataDir, 'files')
  await mkdir(dir, { recursive: true })
  const temp = join(dir, `.${id}.${process.pid}.${Date.now()}`)
  await writeFile(temp, body)
  await rename(temp, join(dir, id))
  const row = {
    name: decode(c.req.header('x-file-name')) || id,
    type: c.req.header('content-type') || 'application/octet-stream',
    size: body.length,
    createdAt: now.toISOString(),
  }
  db.insert(files).values({ id, ...row }).onConflictDoUpdate({ target: files.id, set: row }).run()
  return c.body(null, 204)
}

export function getFile(c: Context, db: Db, dataDir: string): Response {
  const id = c.req.param('id') ?? ''
  const row = ID.test(id) ? db.select().from(files).where(eq(files.id, id)).get() : undefined
  const path = join(dataDir, 'files', id)
  if (!row || !existsSync(path)) return c.json({ error: 'Datei nicht gefunden' }, 404)
  const stream = Readable.toWeb(createReadStream(path)) as ReadableStream
  return new Response(stream, {
    headers: {
      'Content-Type': row.type,
      'Content-Length': String(row.size),
      'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(row.name)}`,
      'Cache-Control': 'private, max-age=3600',
    },
  })
}
