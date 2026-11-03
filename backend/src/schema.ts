// Database schema (Drizzle). The app state is stored as records (one row per record, value as JSON),
// exactly as the frontend sends them; see docs/backend.md.
import { integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core'

/** Key/value: global revision (`rev`), first start (`firstStart`). */
export const meta = sqliteTable('meta', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
})

/** All records of all collections. The implicit rowid keeps the insertion order (updates are upserts). */
export const records = sqliteTable('records', {
  coll: text('coll').notNull(),
  id: text('id').notNull(),
  value: text('value').notNull(),
  rev: integer('rev').notNull(),
  clientId: text('client_id'),
  updatedBy: text('updated_by'),
  updatedAt: text('updated_at').notNull(),
}, (t) => [primaryKey({ columns: [t.coll, t.id] })])

/** Accepted batch IDs, so a retried batch is not applied twice. */
export const batches = sqliteTable('batches', {
  id: text('id').primaryKey(),
  rev: integer('rev').notNull(),
  receivedAt: text('received_at').notNull(),
})

export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  auth: text('auth', { enum: ['name', 'password'] }).notNull(),
  createdAt: text('created_at').notNull(),
  lastSeenAt: text('last_seen_at').notNull(),
})

/** scrypt$N$r$p$salt$hash (base64) */
export const passwords = sqliteTable('passwords', {
  userId: text('user_id').primaryKey(),
  hash: text('hash').notNull(),
})

/** Set-password links; only the sha256 of the token is stored. */
export const passwordTokens = sqliteTable('password_tokens', {
  hash: text('hash').primaryKey(),
  userId: text('user_id').notNull(),
  expiresAt: text('expires_at').notNull(),
  usedAt: text('used_at'),
})

/** Uploaded files; the content lives under DATA_DIR/files/<id>. */
export const files = sqliteTable('files', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  type: text('type').notNull(),
  size: integer('size').notNull(),
  createdAt: text('created_at').notNull(),
})
