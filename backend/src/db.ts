// SQLite file under DATA_DIR (/data in the container, ./data locally). Migrations from drizzle/
// run on every start; new ones are created with `npm run db:generate` after changes to schema.ts.
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as schema from './schema.js'

export const dataDir = process.env.DATA_DIR ?? 'data'
mkdirSync(dataDir, { recursive: true })

const sqlite = new Database(join(dataDir, 'wartung.db'))
// WAL: reads don't block writes, and Litestream can tail the file later.
sqlite.pragma('journal_mode = WAL')
sqlite.pragma('foreign_keys = ON')

export const db = drizzle(sqlite, { schema })

const migrationsFolder = join(dirname(fileURLToPath(import.meta.url)), '..', 'drizzle')
migrate(db, { migrationsFolder })

db.insert(schema.meta)
  .values({ key: 'firstStart', value: new Date().toISOString() })
  .onConflictDoNothing()
  .run()
