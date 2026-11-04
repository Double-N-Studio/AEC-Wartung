// Permission rules (rules.ts) without HTTP: who may change what, old vs. new record.
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { checkChange, checkHistory, type RuleContext } from '../src/rules.js'
import type { Plain, User } from '../src/state.js'
import { ADMIN, defect, entry, LEAD, LEAD2, MEMBER, MEMBER2, TABLET, task } from './helpers.js'

const TODAY = '2026-11-07'
const ctx = (user: User, leader?: string): RuleContext => ({
  user, today: [TODAY], schedule: leader ? { [TODAY]: { leader } } : {},
})
const check = (coll: string, old: Plain | undefined, value: Plain | null, user: User, leader?: string) =>
  checkChange({ coll, id: (value?.id ?? old?.id ?? coll) as string, value }, old, ctx(user, leader))
const ok = (result: string | null) => assert.equal(result, null)
const denied = (result: string | null) => assert.equal(typeof result, 'string', 'expected a rejection')

describe('collections by permission', () => {
  for (const coll of ['users', 'season', 'aircraft', 'templates', 'archive', 'faq']) {
    it(`${coll}: admin only`, () => {
      const value = { id: 'x' }
      denied(check(coll, undefined, value, MEMBER))
      denied(check(coll, undefined, value, LEAD))
      ok(check(coll, undefined, value, ADMIN))
    })
  }
  for (const coll of ['deadlines', 'vereinsflieger']) {
    it(`${coll}: server only, even for admins`, () => {
      denied(check(coll, undefined, { id: 'x' }, ADMIN))
      denied(check(coll, { id: 'x' }, null, ADMIN))
    })
  }
  for (const coll of ['documents', 'inventory', 'orders']) {
    it(`${coll}: everyone signed in`, () => {
      ok(check(coll, undefined, { id: 'x', history: [entry(MEMBER.id)] }, MEMBER))
      ok(check(coll, { id: 'x', history: [] }, null, MEMBER))
    })
  }
  it('unknown collection', () => denied(check('secrets', undefined, { id: 'x' }, ADMIN)))
})

describe('history', () => {
  const allowed = new Set(['me'])
  const old = [entry('other', 'Alt')]
  it('new entries in front by the actor', () => ok(checkHistory(old, [entry('me'), ...old], allowed)))
  it('entries in someone else\'s name', () => denied(checkHistory(old, [entry('other'), ...old], allowed)))
  it('shortened', () => denied(checkHistory(old, [], allowed)))
  it('changed old entry', () => denied(checkHistory(old, [{ ...old[0]!, text: 'Neu' }], allowed)))
  it('appended at the end instead of the front', () => denied(checkHistory(old, [...old, entry('me')], allowed)))
  it('own entry of the same day may get a new text (repeated count)', () => {
    const own = [entry('me', 'Gezählt: 3 Stk.')]
    ok(checkHistory(own, [{ ...own[0]!, text: 'Gezählt: 4 Stk.' }], allowed))
  })
  it('applies to inventory, orders and defects', () => {
    denied(check('inventory', { id: 'i', history: [] }, { id: 'i', history: [entry(MEMBER2.id)] }, MEMBER))
    denied(check('orders', { id: 'o', history: [entry('x')] }, { id: 'o', history: [] }, MEMBER))
    denied(check('defects', defect(), defect({ history: [entry(LEAD.id), ...defect().history] }), MEMBER))
  })
})

describe('tasks', () => {
  const t = task()
  it('member may work on a card', () => {
    ok(check('tasks', t, task({ status: 'arbeit', history: [entry(MEMBER.id, 'Arbeit gestartet'), ...t.history] }), MEMBER))
  })
  it('member may create and delete unsigned cards', () => {
    ok(check('tasks', undefined, task({ history: [entry(MEMBER.id)] }), MEMBER))
    ok(check('tasks', t, null, MEMBER))
  })
  it('"Als erledigt gemeldet" may be logged in the name of whoever started', () => {
    const started = task({ status: 'arbeit', history: [entry(MEMBER2.id, 'Arbeit gestartet'), ...t.history] })
    const done = { ...started, status: 'erledigt', doneBy: MEMBER2.id, doneAt: '2026-11-07T12:00', history: [entry(MEMBER2.id, 'Als erledigt gemeldet'), ...started.history] }
    ok(check('tasks', started, done, MEMBER))
    // but not in the name of someone who never appeared on the card
    denied(check('tasks', started, { ...done, doneBy: LEAD.id, history: [entry(LEAD.id), ...started.history] }, MEMBER))
  })
  it('only leads sign off', () => {
    const signed = (by: string) => task({ status: 'erledigt', signedBy: by, signedAt: TODAY, history: [entry(by, 'Abgezeichnet'), ...t.history] })
    denied(check('tasks', t, signed(MEMBER.id), MEMBER))
    ok(check('tasks', t, signed(LEAD.id), LEAD))
    ok(check('tasks', t, signed(ADMIN.id), ADMIN))
  })
  it('leads sign off only in their own name', () => {
    denied(check('tasks', t, task({ signedBy: LEAD2.id, signedAt: TODAY, history: [entry(LEAD2.id), ...t.history] }), LEAD))
  })
  it('tablet signs off as the workshop lead of the day', () => {
    const signed = (by: string) => task({ signedBy: by, signedAt: TODAY, history: [entry(by, 'Abgezeichnet'), ...t.history] })
    ok(check('tasks', t, signed(LEAD2.id), TABLET, LEAD2.id))
    denied(check('tasks', t, signed(LEAD.id), TABLET, LEAD2.id))
    denied(check('tasks', t, signed(TABLET.id), TABLET, LEAD2.id))
    // without a lead for the day: the tablet itself
    ok(check('tasks', t, signed(TABLET.id), TABLET))
    denied(check('tasks', t, signed(LEAD2.id), TABLET))
  })
  it('tablet logs as itself or as the lead of the day', () => {
    ok(check('tasks', t, task({ history: [entry(TABLET.id), ...t.history] }), TABLET, LEAD2.id))
    ok(check('tasks', t, task({ history: [entry(LEAD2.id), ...t.history] }), TABLET, LEAD2.id))
    denied(check('tasks', t, task({ history: [entry(LEAD.id), ...t.history] }), TABLET, LEAD2.id))
  })

  describe('signed-off cards are locked', () => {
    const signed = task({ status: 'erledigt', doneBy: MEMBER.id, signedBy: LEAD.id, signedAt: TODAY })
    const unsigned = () => {
      const { signedBy: _, signedAt: __, ...rest } = signed
      return rest
    }
    it('members cannot change or delete them', () => {
      denied(check('tasks', signed, { ...signed, title: 'Neu' }, MEMBER))
      denied(check('tasks', signed, { ...unsigned(), history: [entry(MEMBER.id), ...signed.history] }, MEMBER))
      denied(check('tasks', signed, null, MEMBER))
    })
    it('leads may only take back the sign-off', () => {
      ok(check('tasks', signed, { ...unsigned(), history: [entry(LEAD2.id, 'Abzeichnung zurückgenommen'), ...signed.history] }, LEAD2))
      denied(check('tasks', signed, { ...signed, title: 'Neu' }, LEAD))
      denied(check('tasks', signed, { ...unsigned(), status: 'arbeit' }, LEAD))
      denied(check('tasks', signed, { ...signed, signedBy: LEAD2.id }, LEAD2))
    })
    it('leads (and admins deleting an aircraft) may delete them', () => {
      ok(check('tasks', signed, null, LEAD))
      ok(check('tasks', signed, null, ADMIN))
    })
    it('notes are locked too', () => {
      denied(check('tasks', signed, { ...signed, notes: [{ id: 'n', text: 'x', photos: [], who: LEAD.id, at: TODAY }] }, LEAD))
    })
  })

  describe('notes', () => {
    const note = (id: string, who: string) => ({ id, text: 'Notiz', photos: [], who, at: `${TODAY}T11:00` })
    const withNotes = task({ notes: [note('n1', MEMBER.id), note('n2', MEMBER2.id)] })
    it('add in your own name', () => {
      ok(check('tasks', withNotes, { ...withNotes, notes: [...withNotes.notes, note('n3', MEMBER.id)] }, MEMBER))
      denied(check('tasks', withNotes, { ...withNotes, notes: [...withNotes.notes, note('n3', MEMBER2.id)] }, MEMBER))
    })
    it('members delete only their own', () => {
      ok(check('tasks', withNotes, { ...withNotes, notes: [note('n2', MEMBER2.id)] }, MEMBER))
      denied(check('tasks', withNotes, { ...withNotes, notes: [note('n1', MEMBER.id)] }, MEMBER))
    })
    it('leads delete any', () => ok(check('tasks', withNotes, { ...withNotes, notes: [] }, LEAD)))
    it('existing notes never change', () => {
      denied(check('tasks', withNotes, { ...withNotes, notes: [{ ...note('n1', MEMBER.id), text: 'anders' }, note('n2', MEMBER2.id)] }, MEMBER))
      denied(check('tasks', withNotes, { ...withNotes, notes: [note('n1', MEMBER.id), { ...note('n2', MEMBER2.id), text: 'x' }] }, LEAD))
    })
  })
})

describe('defects', () => {
  const vf = defect({ source: 'vf', reportedBy: 'system', history: [entry('system', 'Aus Vereinsflieger')] })
  it('own findings: create, edit, delete', () => {
    ok(check('defects', undefined, defect({ history: [entry(MEMBER2.id)] }), MEMBER2))
    ok(check('defects', defect(), defect({ title: 'Neu', history: [entry(MEMBER2.id, 'Bearbeitet.'), ...defect().history] }), MEMBER2))
    ok(check('defects', defect(), null, MEMBER2))
  })
  it('the source never changes', () => {
    denied(check('defects', defect(), defect({ source: 'vf' }), ADMIN))
    denied(check('defects', vf, { ...vf, source: 'befund' }, ADMIN))
  })
  it('defects from Vereinsflieger cannot be created or deleted', () => {
    denied(check('defects', undefined, vf, ADMIN))
    denied(check('defects', vf, null, ADMIN))
  })
  it('defects from Vereinsflieger: only status, owner, card and history', () => {
    ok(check('defects', vf, {
      ...vf, status: 'done', owner: MEMBER.id, taskId: 't1', doneAt: TODAY, doneBy: MEMBER.id,
      history: [entry(MEMBER.id, 'Als erledigt markiert.'), ...vf.history],
    }, MEMBER))
    ok(check('defects', { ...vf, taskId: 't1' }, vf, MEMBER))
    denied(check('defects', vf, { ...vf, title: 'Anders' }, ADMIN))
    denied(check('defects', vf, { ...vf, photos: [{ id: 'f', name: 'x', type: 'image/jpeg', size: 1 }] }, MEMBER))
  })
})

describe('schedule', () => {
  const day = { comment: 'Kuchen mitbringen', history: [entry(LEAD.id)] }
  it('members: comment and history only', () => {
    ok(check('schedule', undefined, { comment: 'x', history: [entry(MEMBER.id)] }, MEMBER))
    ok(check('schedule', day, { ...day, comment: 'Neu', history: [entry(MEMBER.id), ...day.history] }, MEMBER))
    denied(check('schedule', day, { ...day, leader: MEMBER.id }, MEMBER))
    denied(check('schedule', day, { ...day, closed: true, reason: 'Ferien' }, MEMBER))
    denied(check('schedule', day, null, MEMBER))
  })
  it('leads: also leader, closed, reason and deleting days', () => {
    ok(check('schedule', day, { ...day, leader: LEAD.id, history: [entry(LEAD.id), ...day.history] }, LEAD))
    ok(check('schedule', day, { ...day, closed: true, reason: 'Ferien', history: [entry(LEAD.id), ...day.history] }, LEAD))
    ok(check('schedule', day, null, LEAD))
  })
  it('history entries in the actor\'s name', () => {
    denied(check('schedule', day, { ...day, history: [entry(LEAD2.id), ...day.history] }, LEAD))
  })
})

describe('users', () => {
  it('admins cannot change their own role or remove themselves', () => {
    denied(check('users', ADMIN as unknown as Plain, { ...ADMIN, role: 'wl' }, ADMIN))
    denied(check('users', ADMIN as unknown as Plain, { ...ADMIN, removed: true }, ADMIN))
    ok(check('users', ADMIN as unknown as Plain, { ...ADMIN, name: 'Anna B. Admin' }, ADMIN))
  })
  it('admins may change other accounts', () => {
    ok(check('users', LEAD as unknown as Plain, { ...LEAD, role: 'admin' }, ADMIN))
    ok(check('users', LEAD as unknown as Plain, { ...LEAD, removed: true }, ADMIN))
  })
})
