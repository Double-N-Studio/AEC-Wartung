// Datenbank-Schema (Drizzle). Das eigentliche Datenmodell kommt, sobald das Frontend steht –
// vorerst nur eine Schlüssel/Wert-Tabelle, damit Migrationen beim Start nachweislich laufen.
import { sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const meta = sqliteTable('meta', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
})
