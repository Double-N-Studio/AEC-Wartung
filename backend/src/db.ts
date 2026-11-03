// SQLite via Drizzle. Migrations from drizzle/ run on every open; new ones are created with
// `npm run db:generate` after changes to schema.ts.
import Database from 'better-sqlite3'
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as schema from './schema.js'

export type Db = BetterSQLite3Database<typeof schema>

// Compiled to dist/src/db.js, the migrations are in drizzle/ next to dist/.
const migrationsFolder = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'drizzle')

/** Opens (and migrates) the database at path; ':memory:' for tests. */
export function openDb(path: string): Db {
  const sqlite = new Database(path)
  // WAL: reads don't block writes, and Litestream can tail the file later.
  if (path !== ':memory:') sqlite.pragma('journal_mode = WAL')
  sqlite.pragma('foreign_keys = ON')
  const db = drizzle(sqlite, { schema })
  migrate(db, { migrationsFolder })
  return db
}
