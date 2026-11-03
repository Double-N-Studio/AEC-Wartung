// Database schema (Drizzle). The real data model comes once the frontend is settled –
// for now only a key/value table so migrations demonstrably run on start.
import { sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const meta = sqliteTable('meta', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
})
