// Sessions (cookie), password hashes (scrypt), set-password tokens and a simple rate limit for sign-in.
import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import { and, eq, isNull } from 'drizzle-orm'
import type { Context } from 'hono'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'
import type { Db } from './db.js'
import { passwords, passwordTokens, sessions } from './schema.js'
import { userById, type User } from './state.js'

export const COOKIE = 'wartung_session'
/** Browsers cap cookies at 400 days; the tablet stays signed in for the whole season. */
const MAX_AGE = 400 * 24 * 60 * 60
const DAY = 24 * 60 * 60 * 1000
export const TOKEN_DAYS = 7

export const randomToken = () => randomBytes(32).toString('base64url')
const sha256 = (s: string) => createHash('sha256').update(s).digest('hex')

export interface Session {
  id: string
  user: User
  auth: 'name' | 'password'
}

/** Session of the request; a removed (or unknown) account counts as no session and the row is deleted. */
export function readSession(c: Context, db: Db, now: Date): Session | null {
  const id = getCookie(c, COOKIE)
  if (!id) return null
  const row = db.select().from(sessions).where(eq(sessions.id, id)).get()
  if (!row) return null
  const user = userById(db, row.userId)
  if (!user || user.removed) {
    db.delete(sessions).where(eq(sessions.id, id)).run()
    return null
  }
  if (now.getTime() - Date.parse(row.lastSeenAt) > DAY) {
    db.update(sessions).set({ lastSeenAt: now.toISOString() }).where(eq(sessions.id, id)).run()
  }
  return { id, user, auth: row.auth }
}

/** New session (an older one of this browser ends). */
export function startSession(c: Context, db: Db, user: User, auth: Session['auth'], now: Date) {
  const old = getCookie(c, COOKIE)
  if (old) db.delete(sessions).where(eq(sessions.id, old)).run()
  const id = randomToken()
  const at = now.toISOString()
  db.insert(sessions).values({ id, userId: user.id, auth, createdAt: at, lastSeenAt: at }).run()
  setCookie(c, COOKIE, id, {
    httpOnly: true, sameSite: 'Lax', path: '/', maxAge: MAX_AGE, secure: process.env.NODE_ENV === 'production',
  })
}

export function endSession(c: Context, db: Db) {
  const id = getCookie(c, COOKIE)
  if (id) db.delete(sessions).where(eq(sessions.id, id)).run()
  deleteCookie(c, COOKIE, { path: '/' })
}

/* ---------- Passwords ---------- */

const N = 16384, R = 8, P = 1, KEYLEN = 64

export function hashPassword(password: string): string {
  const salt = randomBytes(16)
  const hash = scryptSync(password, salt, KEYLEN, { N, r: R, p: P })
  return ['scrypt', N, R, P, salt.toString('base64'), hash.toString('base64')].join('$')
}

export function verifyPassword(password: string, stored: string): boolean {
  const [kind, n, r, p, salt, hash] = stored.split('$')
  if (kind !== 'scrypt' || !salt || !hash) return false
  const expected = Buffer.from(hash, 'base64')
  const actual = scryptSync(password, Buffer.from(salt, 'base64'), expected.length, { N: Number(n), r: Number(r), p: Number(p) })
  return timingSafeEqual(actual, expected)
}

export function checkPassword(db: Db, userId: string, password: string) {
  const row = db.select().from(passwords).where(eq(passwords.userId, userId)).get()
  return !!row && verifyPassword(password, row.hash)
}

/** New set-password token (7 days); older tokens of the account stop working. Returns the token itself. */
export function createPasswordToken(db: Db, userId: string, now: Date): string {
  const token = randomToken()
  db.transaction((tx) => {
    tx.delete(passwordTokens).where(eq(passwordTokens.userId, userId)).run()
    tx.insert(passwordTokens).values({
      hash: sha256(token), userId, expiresAt: new Date(now.getTime() + TOKEN_DAYS * DAY).toISOString(),
    }).run()
  })
  return token
}

/** Sets the password if the token is valid; false if it is unknown, used or expired. */
export function usePasswordToken(db: Db, token: string, password: string, now: Date): boolean {
  return db.transaction((tx) => {
    const row = tx.select().from(passwordTokens).where(and(eq(passwordTokens.hash, sha256(token)), isNull(passwordTokens.usedAt))).get()
    if (!row || Date.parse(row.expiresAt) <= now.getTime()) return false
    const hash = hashPassword(password)
    tx.insert(passwords).values({ userId: row.userId, hash }).onConflictDoUpdate({ target: passwords.userId, set: { hash } }).run()
    tx.update(passwordTokens).set({ usedAt: now.toISOString() }).where(eq(passwordTokens.hash, row.hash)).run()
    return true
  })
}

/* ---------- Rate limit ---------- */

/** Failed attempts per key (IP) in a sliding window; in memory, so a restart resets it. */
export function rateLimit(max = 20, windowMs = 15 * 60 * 1000) {
  const attempts = new Map<string, number[]>()
  const recent = (key: string, now: number) => (attempts.get(key) ?? []).filter((t) => now - t < windowMs)
  return {
    blocked(key: string, now: number) {
      return recent(key, now).length >= max
    },
    fail(key: string, now: number) {
      const list = recent(key, now)
      list.push(now)
      attempts.set(key, list)
      if (attempts.size > 10_000) attempts.clear()
    },
  }
}

/** Client address: nginx on the VPS appends the real address to X-Forwarded-For; locally the header is missing. */
export function clientIp(c: Context): string {
  const forwarded = c.req.header('x-forwarded-for')
  if (forwarded) return forwarded.split(',').at(-1)!.trim()
  return c.req.header('x-real-ip') ?? 'local'
}
