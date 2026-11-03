// Shape checks per collection (frontend/src/types.ts). Unknown extra fields are allowed, so a newer frontend
// can add optional fields without a server release; missing or mistyped required fields are rejected (422).
import { z } from 'zod'
import { COLLECTIONS, needsPassword, SINGLES, type User } from './state.js'
import type { Change } from './rules.js'

const str = z.string()
const opt = z.string().optional()
const history = z.array(z.looseObject({ text: str, who: str, at: str }))
const file = z.looseObject({ id: str, name: str, type: str, size: z.number() })
const level = z.enum(['ein', 'erf', 'wl'])
const day = z.looseObject({
  leader: z.string().nullable().optional(), closed: z.boolean().optional(), reason: opt, comment: opt, history: history.optional(),
})

const task = z.looseObject({
  id: str, aircraftId: str, status: z.enum(['offen', 'arbeit', 'erledigt']), level, title: str, desc: str, duration: str,
  checklist: z.array(z.looseObject({ text: str, done: z.boolean() })),
  notes: z.array(z.looseObject({ id: str, text: str, photos: z.array(file), who: str, at: str })).optional(),
  deadline: opt, docId: opt, defectId: opt, templateId: opt, doneBy: opt, doneAt: opt, signedBy: opt, signedAt: opt,
  history,
})

const SCHEMAS: Record<string, z.ZodType> = {
  users: z.looseObject({
    id: str, name: z.string().trim().min(1), role: z.enum(['admin', 'wl', 'user']),
    email: opt, device: z.boolean().optional(), removed: z.boolean().optional(),
  }),
  aircraft: z.looseObject({ id: str, type: str, reg: str, serial: opt, retired: z.boolean().optional(), manager: opt, start: str, end: str }),
  tasks: task,
  templates: z.looseObject({
    id: str, aircraftType: str, level, title: str, desc: str, duration: str, checklist: z.array(str), docTitle: opt,
  }),
  archive: z.looseObject({
    id: str, label: str, start: str, end: str, aircraft: z.array(z.looseObject({ id: str })), tasks: z.array(task),
    schedule: z.record(z.string(), day), closedAt: str, closedBy: str,
  }),
  defects: z.looseObject({
    id: str, aircraftId: str, title: str, desc: str, source: z.enum(['vf', 'befund']), photos: z.array(file),
    reportedAt: str, reportedBy: str, priority: z.enum(['Sehr niedrig', 'Niedrig', 'Normal', 'Hoch']),
    owner: z.string().nullable(), status: z.enum(['open', 'done']), doneAt: opt, doneBy: opt, taskId: opt, history,
  }),
  deadlines: z.looseObject({ id: str, aircraftId: str, title: str }),
  documents: z.looseObject({
    id: str, aircraftId: opt, aircraftType: opt, title: str, kind: str, version: str, file: file.optional(),
    addedAt: str, addedBy: str,
  }),
  inventory: z.looseObject({
    id: str, kind: z.enum(['vs', 'et']), name: str, location: str, mode: z.enum(['count', 'flag']), qty: z.number(),
    unit: z.tuple([str, str]), fits: opt, history,
  }),
  orders: z.looseObject({
    id: str, itemId: opt, name: str, forWhat: str, state: z.enum(['list', 'ordered', 'delivered']),
    reportedBy: str, reportedAt: str, comment: str, price: z.number().optional(), deliveredQty: z.number().optional(), history,
  }),
  schedule: day,
  season: z.looseObject({ label: str, start: str, end: str }),
  vereinsflieger: z.looseObject({ lastSync: str, error: opt }),
}

const DATE = /^\d{4}-\d{2}-\d{2}$/

/**
 * German error text if the change is malformed, otherwise null.
 * users: all accounts as they will be after the batch (for the unique e-mail).
 */
export function validateChange(change: Change, users: User[]): string | null {
  const { coll, id, value } = change
  if (!COLLECTIONS.includes(coll)) return `Unbekannte Sammlung: ${coll}`
  const single = (SINGLES as readonly string[]).includes(coll)
  if (single && id !== coll) return `${coll} hat keine Einträge`
  if (coll === 'schedule' && !DATE.test(id)) return `Ungültiges Datum: ${id}`
  if (value === null) {
    if (single) return `${coll} kann nicht gelöscht werden`
    if (coll === 'users') return 'Konten werden nicht gelöscht, nur entfernt'
    return null
  }
  const result = SCHEMAS[coll]!.safeParse(value)
  if (!result.success) {
    const issue = result.error.issues[0]
    return `Ungültige Daten in ${coll}/${id}: ${issue?.path.join('.') || 'Wert'} – ${issue?.message ?? ''}`.trim()
  }
  if (!single && coll !== 'schedule' && value.id !== id) return `${coll}/${id}: ID passt nicht`
  if (coll === 'users') return checkAccount(value as unknown as User, users)
  return null
}

function checkAccount(user: User, users: User[]): string | null {
  if (!needsPassword(user)) return user.email ? 'Mitglieder haben keine E-Mail-Adresse' : null
  const email = user.email?.trim().toLowerCase()
  if (!email) return 'Konten mit Passwort brauchen eine E-Mail-Adresse'
  const taken = users.some((u) => u.id !== user.id && !u.removed && u.email?.trim().toLowerCase() === email)
  return taken && !user.removed ? 'Diese E-Mail-Adresse wird schon verwendet' : null
}
