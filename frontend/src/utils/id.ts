/**
 * IDs are created on the device so records created offline immediately have a fixed ID
 * and two devices never assign the same one. randomUUID is only available over https or localhost.
 */
export function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}-${Math.random().toString(36).slice(2, 12)}`
}
