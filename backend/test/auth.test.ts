// Sign-in by name and with password, password links, sessions.
import assert from 'node:assert/strict'
import { beforeEach, describe, it } from 'node:test'
import { hashPassword } from '../src/auth.js'
import { passwords } from '../src/schema.js'
import { users } from '../src/state.js'
import { ADMIN, getState, LEAD, login, MEMBER, put, setup, TABLET } from './helpers.js'

let t: ReturnType<typeof setup>
beforeEach(() => {
  t = setup()
  put(t.db, 'users', [ADMIN, LEAD, MEMBER, TABLET])
})

const json = (body: unknown, headers: Record<string, string> = {}) => ({
  method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body),
})
const cookieOf = (res: Response) => ({ Cookie: res.headers.get('set-cookie')!.split(';')[0]! })

async function sessionOf(headers: Record<string, string>) {
  return (await (await t.app.request('/api/session', { headers })).json()) as { userId: string | null; auth: string | null }
}

describe('POST /session/name', () => {
  it('creates the account once and matches names case-insensitively', async () => {
    const res = await t.app.request('/api/session/name', json({ name: '  Erika   Muster ' }))
    assert.equal(res.status, 200)
    const { user } = (await res.json()) as { user: { id: string; name: string; role: string } }
    assert.equal(user.name, 'Erika Muster')
    assert.equal(user.role, 'user')
    assert.match(res.headers.get('set-cookie')!, /wartung_session=.+HttpOnly.*SameSite=Lax/i)
    assert.deepEqual(await sessionOf(cookieOf(res)), { userId: user.id, auth: 'name' })

    const again = await t.app.request('/api/session/name', json({ name: 'erika muster' }))
    assert.equal(((await again.json()) as { user: { id: string } }).user.id, user.id)
    assert.equal(users(t.db).filter((u) => u.name === 'Erika Muster').length, 1)
    // The new account is a revision of its own, so other devices reload.
    assert.equal((await getState(t.app)).rev, 2)
  })

  it('finds existing members', async () => {
    const res = await t.app.request('/api/session/name', json({ name: 'MAX MITGLIED' }))
    assert.equal(((await res.json()) as { user: { id: string } }).user.id, MEMBER.id)
  })

  it('409 for the name of a special account', async () => {
    assert.equal((await t.app.request('/api/session/name', json({ name: 'werner leiter' }))).status, 409)
    assert.equal((await t.app.request('/api/session/name', json({ name: 'Werkstatt-Tablet' }))).status, 409)
  })

  it('400 for an empty name', async () => {
    assert.equal((await t.app.request('/api/session/name', json({ name: '   ' }))).status, 400)
    assert.equal((await t.app.request('/api/session/name', json({}))).status, 400)
  })

  it('a removed member\'s name creates a new account', async () => {
    put(t.db, 'users', [{ ...MEMBER, removed: true }])
    const res = await t.app.request('/api/session/name', json({ name: MEMBER.name }))
    assert.notEqual(((await res.json()) as { user: { id: string } }).user.id, MEMBER.id)
  })
})

describe('POST /session/login', () => {
  beforeEach(() => {
    t.db.insert(passwords).values({ userId: LEAD.id, hash: hashPassword('richtig-geheim') }).run()
  })

  it('signs in with the right password, e-mail case-insensitive', async () => {
    const res = await t.app.request('/api/session/login', json({ email: ' Werner@Example.org', password: 'richtig-geheim' }))
    assert.equal(res.status, 200)
    assert.equal(((await res.json()) as { user: { id: string } }).user.id, LEAD.id)
    assert.deepEqual(await sessionOf(cookieOf(res)), { userId: LEAD.id, auth: 'password' })
  })

  it('401 for a wrong password, an unknown e-mail or an account without password', async () => {
    assert.equal((await t.app.request('/api/session/login', json({ email: LEAD.email, password: 'falsch' }))).status, 401)
    assert.equal((await t.app.request('/api/session/login', json({ email: 'wer@example.org', password: 'x' }))).status, 401)
    assert.equal((await t.app.request('/api/session/login', json({ email: ADMIN.email, password: 'x' }))).status, 401)
  })

  it('401 for removed accounts', async () => {
    put(t.db, 'users', [{ ...LEAD, removed: true }])
    assert.equal((await t.app.request('/api/session/login', json({ email: LEAD.email, password: 'richtig-geheim' }))).status, 401)
  })

  it('rate limit after 20 failed attempts', async () => {
    const from = { 'X-Forwarded-For': '203.0.113.9' }
    for (let i = 0; i < 20; i++) await t.app.request('/api/session/login', json({ email: LEAD.email, password: 'falsch' }, from))
    const res = await t.app.request('/api/session/login', json({ email: LEAD.email, password: 'richtig-geheim' }, from))
    assert.equal(res.status, 429)
    // Other addresses are not affected, and the window expires.
    assert.equal((await t.app.request('/api/session/login', json({ email: LEAD.email, password: 'richtig-geheim' }))).status, 200)
    t.clock.now = new Date(t.clock.now.getTime() + 16 * 60 * 1000)
    assert.equal((await t.app.request('/api/session/login', json({ email: LEAD.email, password: 'richtig-geheim' }, from))).status, 200)
  })
})

describe('sessions', () => {
  it('GET /session without a cookie', async () => {
    assert.deepEqual(await sessionOf({}), { userId: null, auth: null })
  })

  it('DELETE /session ends it', async () => {
    const cookie = login(t.db, MEMBER)
    const res = await t.app.request('/api/session', { method: 'DELETE', headers: cookie })
    assert.equal(res.status, 204)
    assert.deepEqual(await sessionOf(cookie), { userId: null, auth: null })
  })

  it('a removed account loses its session', async () => {
    const cookie = login(t.db, MEMBER)
    put(t.db, 'users', [{ ...MEMBER, removed: true }])
    assert.deepEqual(await sessionOf(cookie), { userId: null, auth: null })
  })
})

describe('password links', () => {
  const link = (id: string, headers: Record<string, string>) => t.app.request(`/api/users/${id}/password-link`, { method: 'POST', headers })
  const setPassword = (token: string, password = 'neues-passwort') => t.app.request('/api/password', json({ token, password }))
  const tokenOf = async (res: Response) => ((await res.json()) as { token: string }).token

  it('only admins signed in with a password', async () => {
    assert.equal((await link(LEAD.id, {})).status, 401)
    assert.equal((await link(LEAD.id, login(t.db, LEAD))).status, 403)
    assert.equal((await link(LEAD.id, login(t.db, ADMIN, 'name'))).status, 403)
    assert.equal((await link(LEAD.id, login(t.db, ADMIN))).status, 200)
  })

  it('404 for unknown accounts, 422 for members', async () => {
    const admin = login(t.db, ADMIN)
    assert.equal((await link('nobody', admin)).status, 404)
    assert.equal((await link(MEMBER.id, admin)).status, 422)
  })

  it('sets the password once; the account can then sign in', async () => {
    const token = await tokenOf(await link(LEAD.id, login(t.db, ADMIN)))
    assert.equal((await setPassword(token)).status, 204)
    assert.equal((await setPassword(token, 'noch-ein-passwort')).status, 400)
    const res = await t.app.request('/api/session/login', json({ email: LEAD.email, password: 'neues-passwort' }))
    assert.equal(res.status, 200)
  })

  it('a newer token invalidates older ones', async () => {
    const admin = login(t.db, ADMIN)
    const old = await tokenOf(await link(LEAD.id, admin))
    const fresh = await tokenOf(await link(LEAD.id, admin))
    assert.equal((await setPassword(old)).status, 400)
    assert.equal((await setPassword(fresh)).status, 204)
  })

  it('expires after 7 days', async () => {
    const token = await tokenOf(await link(LEAD.id, login(t.db, ADMIN)))
    t.clock.now = new Date(t.clock.now.getTime() + 7 * 24 * 60 * 60 * 1000 + 1000)
    assert.equal((await setPassword(token)).status, 400)
  })

  it('still valid just before 7 days', async () => {
    const token = await tokenOf(await link(LEAD.id, login(t.db, ADMIN)))
    t.clock.now = new Date(t.clock.now.getTime() + 7 * 24 * 60 * 60 * 1000 - 1000)
    assert.equal((await setPassword(token)).status, 204)
  })

  it('400 for short passwords and unknown tokens', async () => {
    const token = await tokenOf(await link(LEAD.id, login(t.db, ADMIN)))
    assert.equal((await setPassword(token, 'kurz')).status, 400)
    assert.equal((await setPassword('unbekannt')).status, 400)
    // the short attempt did not use up the token
    assert.equal((await setPassword(token)).status, 204)
  })

  it('setting a password keeps existing sessions', async () => {
    const cookie = login(t.db, LEAD)
    const token = await tokenOf(await link(LEAD.id, login(t.db, ADMIN)))
    await setPassword(token)
    assert.equal((await sessionOf(cookie)).userId, LEAD.id)
  })
})
