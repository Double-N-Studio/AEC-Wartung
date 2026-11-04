// POST /changes and GET /state through the HTTP layer: retries, conflicts, all or nothing, aircraft cascade.
import assert from 'node:assert/strict'
import { beforeEach, describe, it } from 'node:test'
import { getRev } from '../src/state.js'
import { ADMIN, aircraft, defect, entry, getState, LEAD, login, MEMBER, push, put, setup, task } from './helpers.js'

let t: ReturnType<typeof setup>
beforeEach(() => {
  t = setup()
  put(t.db, 'users', [ADMIN, LEAD, MEMBER])
})

describe('GET /state', () => {
  it('always has all keys, with defaults for the single values', async () => {
    const { rev, state } = await getState(t.app)
    assert.equal(rev, 1)
    assert.deepEqual(Object.keys(state).sort(), [
      'aircraft', 'archive', 'deadlines', 'defects', 'documents', 'inventory', 'orders', 'schedule', 'season',
      'tasks', 'templates', 'users', 'vereinsflieger',
    ])
    assert.deepEqual(state.season, { label: '', start: '', end: '' })
    assert.deepEqual(state.vereinsflieger, { lastSync: '' })
  })

  it('round-trips the records unchanged and keeps the insertion order across updates', async () => {
    const admin = login(t.db, ADMIN)
    const a2 = aircraft({ id: 'z', reg: 'D-0002' })
    const a1 = aircraft({ id: 'a', reg: 'D-0001', extra: { nested: [1, 2] } })
    assert.equal((await push(t.app, admin, [{ coll: 'aircraft', id: 'z', value: a2 }, { coll: 'aircraft', id: 'a', value: a1 }])).status, 200)
    assert.equal((await push(t.app, admin, [{ coll: 'aircraft', id: 'z', value: { ...a2, reg: 'D-0003' } }])).status, 200)
    assert.equal((await push(t.app, admin, [{ coll: 'schedule', id: '2026-11-14', value: { leader: LEAD.id, history: [entry(ADMIN.id)] } }])).status, 200)
    assert.equal((await push(t.app, admin, [{ coll: 'season', id: 'season', value: { label: '2026/27', start: '2026-11-07', end: '2027-03-27' } }])).status, 200)
    const { state } = await getState(t.app)
    assert.deepEqual(state.aircraft, [{ ...a2, reg: 'D-0003' }, a1])
    assert.deepEqual(state.users, [ADMIN, LEAD, MEMBER])
    assert.deepEqual(state.schedule, { '2026-11-14': { leader: LEAD.id, history: [entry(ADMIN.id)] } })
    assert.equal(state.season.label, '2026/27')
  })
})

describe('POST /changes', () => {
  it('400 on garbage', async () => {
    const res = await t.app.request('/api/changes', { method: 'POST', body: 'nope', headers: login(t.db, ADMIN) })
    assert.equal(res.status, 400)
  })

  it('401 without a session, and for removed accounts', async () => {
    assert.equal((await push(t.app, null, [{ coll: 'tasks', id: 't1', value: task() }])).status, 401)
    const cookie = login(t.db, MEMBER)
    put(t.db, 'users', [{ ...MEMBER, removed: true }])
    assert.equal((await push(t.app, cookie, [{ coll: 'tasks', id: 't1', value: task() }])).status, 401)
  })

  it('a retried batch returns the current rev without applying it again', async () => {
    const cookie = login(t.db, MEMBER)
    const first = await push(t.app, cookie, [{ coll: 'tasks', id: 't1', value: task({ history: [entry(MEMBER.id)] }) }], { id: 'same' })
    assert.deepEqual(first, { status: 200, body: { rev: 2 } })
    await push(t.app, cookie, [{ coll: 'tasks', id: 't2', value: task({ id: 't2', history: [entry(MEMBER.id)] }) }])
    // The retry changes the title back – it must not be applied.
    const retry = await push(t.app, cookie, [{ coll: 'tasks', id: 't1', value: task({ title: 'Wiederholt', history: [entry(MEMBER.id)] }) }], { id: 'same' })
    assert.deepEqual(retry, { status: 200, body: { rev: 3 } })
    assert.equal((await getState(t.app)).state.tasks[0].title, 'Reifen prüfen')
  })

  it('a retry is answered even without a session (the cookie may be gone)', async () => {
    await push(t.app, login(t.db, MEMBER), [{ coll: 'tasks', id: 't1', value: task({ history: [entry(MEMBER.id)] }) }], { id: 'b' })
    assert.equal((await push(t.app, null, [], { id: 'b' })).status, 200)
  })

  it('409 when another device changed the record after baseRev, not for the same device', async () => {
    const cookie = login(t.db, MEMBER)
    const v1 = task({ history: [entry(MEMBER.id)] })
    await push(t.app, cookie, [{ coll: 'tasks', id: 't1', value: v1 }], { clientId: 'A', baseRev: 1 })
    const v2 = { ...v1, title: 'B' }
    const other = await push(t.app, cookie, [{ coll: 'tasks', id: 't1', value: v2 }], { clientId: 'B', baseRev: 1 })
    assert.equal(other.status, 409)
    assert.equal(other.body.error, 'tasks/t1 wurde inzwischen geändert')
    // Same device, still on the old baseRev (quick follow-up change): fine.
    assert.equal((await push(t.app, cookie, [{ coll: 'tasks', id: 't1', value: v2 }], { clientId: 'A', baseRev: 1 })).status, 200)
    // Another device that has seen the change: fine.
    assert.equal((await push(t.app, cookie, [{ coll: 'tasks', id: 't1', value: { ...v2, title: 'C' } }], { clientId: 'B', baseRev: 3 })).status, 200)
  })

  it('all or nothing: one rejected change rejects the whole batch', async () => {
    const before = await getState(t.app)
    const res = await push(t.app, login(t.db, MEMBER), [
      { coll: 'tasks', id: 't1', value: task({ history: [entry(MEMBER.id)] }) },
      { coll: 'aircraft', id: 'a1', value: aircraft() },
    ])
    assert.equal(res.status, 403)
    assert.equal(res.body.error, 'Nur für Admins')
    assert.deepEqual(await getState(t.app), before)
  })

  it('accepts templates for all aircraft or a list of types', async () => {
    const admin = login(t.db, ADMIN)
    const v = (id: string, aircraftTypes: string[]) => ({ id, aircraftTypes, level: 'ein', title: 'Putzen', desc: '', duration: '~1 h', checklist: ['Waschen'] })
    const changes = [{ coll: 'templates', id: 'v1', value: v('v1', []) }, { coll: 'templates', id: 'v2', value: v('v2', ['ASK21', 'LS8']) }]
    assert.equal((await push(t.app, admin, changes)).status, 200)
    assert.deepEqual((await getState(t.app)).state.templates, [v('v1', []), v('v2', ['ASK21', 'LS8'])])
  })

  it('422 for malformed records, with German text', async () => {
    const admin = login(t.db, ADMIN)
    const cases = [
      { coll: 'planes', id: 'x', value: { id: 'x' } },
      { coll: 'tasks', id: 't1', value: task({ id: 'other' }) },
      { coll: 'tasks', id: 't1', value: task({ status: 'fertig' }) },
      { coll: 'tasks', id: 't1', value: { id: 't1' } },
      { coll: 'schedule', id: 'monday', value: {} },
      { coll: 'season', id: 'x', value: { label: '', start: '', end: '' } },
      { coll: 'season', id: 'season', value: null },
      { coll: 'users', id: MEMBER.id, value: null },
      { coll: 'users', id: 'new', value: { id: 'new', name: 'Neu', role: 'wl', email: 'WERNER@example.org ' } },
      { coll: 'users', id: 'new', value: { id: 'new', name: 'Neu', role: 'wl' } },
      { coll: 'users', id: 'new', value: { id: 'new', name: 'Neu', role: 'user', email: 'neu@example.org' } },
      { coll: 'templates', id: 'v1', value: { id: 'v1', aircraftType: 'ASK21', level: 'ein', title: 'Putzen', desc: '', duration: '~1 h', checklist: [] } },
      { coll: 'templates', id: 'v1', value: { id: 'v1', aircraftTypes: [''], level: 'ein', title: 'Putzen', desc: '', duration: '~1 h', checklist: [] } },
    ]
    for (const c of cases) {
      const res = await push(t.app, admin, [c])
      assert.equal(res.status, 422, JSON.stringify(c))
      assert.match(res.body.error!, /\S/)
    }
  })

  it('the e-mail of a removed account can be reused', async () => {
    const admin = login(t.db, ADMIN)
    assert.equal((await push(t.app, admin, [{ coll: 'users', id: LEAD.id, value: { ...LEAD, removed: true } }])).status, 200)
    assert.equal((await push(t.app, admin, [{ coll: 'users', id: 'n', value: { id: 'n', name: 'Neu', role: 'wl', email: LEAD.email } }])).status, 200)
  })

  it('deleting an aircraft deletes its defects and deadlines as rev + 2', async () => {
    put(t.db, 'aircraft', [aircraft(), aircraft({ id: 'a2' })])
    put(t.db, 'tasks', [task()])
    put(t.db, 'defects', [defect(), defect({ id: 'd2', source: 'vf' }), defect({ id: 'd3', aircraftId: 'a2' })])
    put(t.db, 'deadlines', [{ id: 'dl1', aircraftId: 'a1', title: 'ARC' }, { id: 'dl2', aircraftId: 'a2', title: 'ARC' }])
    const rev = getRev(t.db)
    const res = await push(t.app, login(t.db, ADMIN), [
      { coll: 'tasks', id: 't1', value: null }, { coll: 'aircraft', id: 'a1', value: null },
    ])
    assert.deepEqual(res.body, { rev: rev + 2 })
    const { state } = await getState(t.app)
    assert.deepEqual(state.aircraft.map((a: { id: string }) => a.id), ['a2'])
    assert.deepEqual(state.tasks, [])
    assert.deepEqual(state.defects.map((d: { id: string }) => d.id), ['d3'])
    assert.deepEqual(state.deadlines.map((d: { id: string }) => d.id), ['dl2'])
  })

  it('publishes the new rev to SSE listeners', async () => {
    const res = await t.app.request('/api/events')
    assert.equal(res.headers.get('content-type'), 'text/event-stream')
    const reader = res.body!.getReader()
    const read = async () => new TextDecoder().decode((await reader.read()).value)
    assert.match(await read(), /event: rev\ndata: 1\n/)
    await push(t.app, login(t.db, MEMBER), [{ coll: 'tasks', id: 't1', value: task({ history: [entry(MEMBER.id)] }) }])
    assert.match(await read(), /event: rev\ndata: 2\n/)
    await reader.cancel()
  })
})

describe('POST /vereinsflieger/sync', () => {
  it('is not connected yet', async () => {
    const res = await t.app.request('/api/vereinsflieger/sync', { method: 'POST', headers: login(t.db, ADMIN) })
    assert.equal(res.status, 422)
    assert.deepEqual(await res.json(), { error: 'Vereinsflieger ist noch nicht angebunden' })
  })
})
