/**
 * IDs entstehen auf dem Gerät, damit offline angelegte Datensätze sofort eine feste ID haben
 * und zwei Geräte nie dieselbe vergeben. randomUUID gibt es nur über https oder localhost.
 */
export function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}-${Math.random().toString(36).slice(2, 12)}`
}
