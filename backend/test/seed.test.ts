import assert from 'node:assert/strict'
import { and, eq, ne } from 'drizzle-orm'
import { describe, it } from 'node:test'
import { DEFAULT_FAQ } from '../src/faq.js'
import { seed } from '../src/seed.js'
import { records } from '../src/schema.js'
import { listRecords } from '../src/state.js'
import { ADMIN, put, setup } from './helpers.js'

const quiet = { log() {}, warn() {} }

describe('seed', () => {
  it('creates the first admin with the default faq', () => {
    const t = setup()
    const link = seed(t.db, { ADMIN_NAME: 'Anna', ADMIN_EMAIL: 'anna@example.org', APP_URL: 'http://x' }, t.clock.now, quiet)
    assert.match(link ?? '', /^http:\/\/x\/#\/passwort\?token=/)
    assert.deepEqual(listRecords(t.db, 'faq'), DEFAULT_FAQ)
  })

  it('adds the default faq once to a database that already has accounts, and not again after deleting them', () => {
    const t = setup()
    put(t.db, 'users', [ADMIN])
    assert.equal(seed(t.db, {}, t.clock.now, quiet), null)
    assert.equal(listRecords(t.db, 'faq').length, DEFAULT_FAQ.length)
    put(t.db, 'faq', [{ ...DEFAULT_FAQ[0]!, q: 'Geändert' }])
    t.db.delete(records).where(and(eq(records.coll, 'faq'), ne(records.id, DEFAULT_FAQ[0]!.id))).run()
    seed(t.db, {}, t.clock.now, quiet)
    assert.deepEqual(listRecords(t.db, 'faq'), [{ ...DEFAULT_FAQ[0], q: 'Geändert' }])
  })
})
