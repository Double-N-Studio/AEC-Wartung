// Permission rules for changes from a batch: pure functions (no database), so the tests can cover them completely.
// The frontend only hides controls (`can()` in frontend/src/store.ts); this is where they are enforced.
import type { HistoryEntry, Plain, User } from './state.js'

export type Permission = 'edit' | 'lead' | 'admin'

const PERMISSIONS: Record<User['role'], Permission[]> = {
  admin: ['edit', 'lead', 'admin'],
  wl: ['edit', 'lead'],
  user: ['edit'],
}

export interface Change {
  coll: string
  id: string
  value: Plain | null
}

export interface RuleContext {
  /** Signed-in account */
  user: User
  /** Days that count as today: the date of the batch (device time) and the server's date */
  today: string[]
  /** Workshop days, for the workshop lead of the day on the workshop tablet */
  schedule: Record<string, { leader?: string | null } | undefined>
}

export const may = (user: User, p: Permission) => PERMISSIONS[user.role]?.includes(p) ?? false

/** Stable JSON (sorted keys) for comparing records. */
export function stable(value: unknown): string {
  return JSON.stringify(value, (_, v) =>
    v && typeof v === 'object' && !Array.isArray(v)
      ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, (v as Plain)[k]]))
      : v)
}
const same = (a: unknown, b: unknown) => stable(a) === stable(b)
const without = (r: Plain, ...keys: string[]) => Object.fromEntries(Object.entries(r).filter(([k]) => !keys.includes(k)))

/** Workshop leads of the day (on the tablet, entries and sign-offs are made in their name). */
function leadersToday(ctx: RuleContext) {
  return ctx.today.map((d) => ctx.schedule[d]?.leader).filter((l): l is string => !!l)
}

/** Accounts that may appear as `who` in new entries: the signed-in account, on the tablet also the lead of the day. */
export function authors(ctx: RuleContext): Set<string> {
  return new Set([ctx.user.id, ...(ctx.user.device ? leadersToday(ctx) : [])])
}

/**
 * History is append-only: the frontend puts new entries in front (`unshift`), so the old entries must be the
 * unchanged tail. The only rewrite the frontend does is a repeated count on the same day (`logCount`), which
 * changes the text of an own entry.
 */
export function checkHistory(oldList: unknown, newList: unknown, allowed: Set<string>): string | null {
  const before = (Array.isArray(oldList) ? oldList : []) as HistoryEntry[]
  const after = (Array.isArray(newList) ? newList : []) as HistoryEntry[]
  const added = after.length - before.length
  if (added < 0) return 'Der Verlauf kann nicht gekürzt werden'
  for (let i = 0; i < before.length; i++) {
    const o = before[i]!
    const n = after[added + i]!
    if (same(o, n)) continue
    if (allowed.has(o.who) && n.who === o.who && n.at === o.at) continue
    return 'Der Verlauf kann nicht geändert werden'
  }
  for (const e of after.slice(0, added)) {
    if (!allowed.has(e.who)) return 'Neue Einträge im Verlauf müssen vom angemeldeten Konto sein'
  }
  return null
}

const ADMIN_ONLY = ['users', 'season', 'aircraft', 'templates', 'archive']
const SERVER_ONLY = ['deadlines', 'vereinsflieger']
/** Fields of a defect from Vereinsflieger that may be changed in the app. */
const VF_FIELDS = ['status', 'owner', 'taskId', 'doneAt', 'doneBy', 'history']
const DAY_FIELDS_EDIT = ['comment', 'history']

/** German error text if the change is not allowed, otherwise null. old: the stored record, if any. */
export function checkChange(change: Change, old: Plain | undefined, ctx: RuleContext): string | null {
  const { coll, value } = change
  const { user } = ctx
  if (SERVER_ONLY.includes(coll)) return 'Diese Daten kommen nur vom Server'
  if (ADMIN_ONLY.includes(coll)) {
    if (!may(user, 'admin')) return 'Nur für Admins'
    if (coll === 'users' && change.id === user.id && value) {
      if (value.role !== old?.role) return 'Die eigene Rolle kann nicht geändert werden'
      if (value.removed) return 'Das eigene Konto kann nicht entfernt werden'
    }
    return null
  }
  if (!may(user, 'edit')) return 'Keine Berechtigung'
  switch (coll) {
    case 'tasks': return checkTask(old, value, ctx)
    case 'defects': return checkDefect(old, value, ctx)
    case 'schedule': return checkDay(old, value, ctx)
    case 'documents':
    case 'inventory':
    case 'orders':
      return value ? checkHistory(old?.history, value.history, authors(ctx)) : null
  }
  return 'Unbekannte Sammlung'
}

function checkTask(old: Plain | undefined, value: Plain | null, ctx: RuleContext): string | null {
  const lead = may(ctx.user, 'lead')
  if (!value) return old?.signedBy && !lead ? 'Abgezeichnete Karten kann nur die Werkstattleitung löschen' : null
  const who = authors(ctx)

  if (old?.signedBy) {
    if (!lead) return 'Abgezeichnete Karten kann nur die Werkstattleitung ändern'
    // Locked: the only allowed change is taking back the sign-off.
    if (value.signedBy !== undefined || value.signedAt !== undefined
      || !same(without(old, 'signedBy', 'signedAt', 'history'), without(value, 'history'))) {
      return 'Abgezeichnete Karten sind gesperrt – nur die Abzeichnung kann zurückgenommen werden'
    }
    return checkHistory(old.history, value.history, who)
  }

  if (value.signedBy !== old?.signedBy || value.signedAt !== old?.signedAt) {
    if (!lead) return 'Abzeichnen darf nur die Werkstattleitung'
    if (value.signedBy !== undefined && !signers(ctx).includes(value.signedBy as string)) {
      return 'Abzeichnen nur im eigenen Namen'
    }
  }

  // "Als erledigt gemeldet" is logged in the name of whoever started the work (finishTask).
  const history = new Set(who)
  const starters = new Set(((old?.history ?? []) as HistoryEntry[]).map((e) => e.who))
  if (typeof value.doneBy === 'string' && value.doneBy !== old?.doneBy && starters.has(value.doneBy)) history.add(value.doneBy)
  return checkHistory(old?.history, value.history, history) ?? checkNotes(old?.notes, value.notes, who, ctx)
}

/** Who may appear in signedBy: the signed-in person; on the tablet the lead of the day, or the tablet without one. */
function signers(ctx: RuleContext): string[] {
  if (!ctx.user.device) return [ctx.user.id]
  const leaders = leadersToday(ctx)
  return leaders.length ? leaders : [ctx.user.id]
}

/** Notes: add in your own name, delete your own (workshop leads: all), never change existing ones. */
function checkNotes(oldList: unknown, newList: unknown, who: Set<string>, ctx: RuleContext): string | null {
  const before = new Map(((Array.isArray(oldList) ? oldList : []) as Plain[]).map((n) => [n.id, n]))
  const after = new Map(((Array.isArray(newList) ? newList : []) as Plain[]).map((n) => [n.id, n]))
  for (const [id, n] of after) {
    const o = before.get(id)
    if (o && !same(o, n)) return 'Notizen können nicht geändert werden'
    if (!o && !who.has(n.who as string)) return 'Neue Notizen müssen vom angemeldeten Konto sein'
  }
  for (const [id, o] of before) {
    if (!after.has(id) && !who.has(o.who as string) && !may(ctx.user, 'lead')) {
      return 'Notizen anderer kann nur die Werkstattleitung löschen'
    }
  }
  return null
}

function checkDefect(old: Plain | undefined, value: Plain | null, ctx: RuleContext): string | null {
  if (!value) return old?.source === 'vf' ? 'Mängel aus Vereinsflieger können nicht gelöscht werden' : null
  if (!old && value.source === 'vf') return 'Mängel aus Vereinsflieger kommen nur vom Server'
  if (old && value.source !== old.source) return 'Die Herkunft eines Mangels kann nicht geändert werden'
  if (old?.source === 'vf' && !same(without(old, ...VF_FIELDS), without(value, ...VF_FIELDS))) {
    return 'Bei Mängeln aus Vereinsflieger lassen sich nur Status, Zuständigkeit und Kanban-Karte ändern'
  }
  return checkHistory(old?.history, value.history, authors(ctx))
}

function checkDay(old: Plain | undefined, value: Plain | null, ctx: RuleContext): string | null {
  const lead = may(ctx.user, 'lead')
  if (!value) return lead ? null : 'Werkstatttage kann nur die Werkstattleitung löschen'
  const before = old ?? {}
  const changed = [...new Set([...Object.keys(before), ...Object.keys(value)])].filter((k) => !same(before[k], value[k]))
  if (!lead && changed.some((k) => !DAY_FIELDS_EDIT.includes(k))) {
    return 'Werkstattleitung und Schließtage plant nur die Werkstattleitung'
  }
  return checkHistory(before.history, value.history, authors(ctx))
}
