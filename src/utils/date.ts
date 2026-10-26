/** Fester "Heute"-Tag des Mockups. */
export const TODAY = '2027-01-16'
export const NOW = '2027-01-16T11:30'

const WEEKDAYS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']
const WEEKDAYS_LONG = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag']
export const MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember']

const pad = (n: number) => String(n).padStart(2, '0')

export function parse(iso: string): Date {
  const [d, t] = iso.split('T')
  const [y, m, day] = d.split('-').map(Number)
  const [hh, mm] = t ? t.split(':').map(Number) : [0, 0]
  return new Date(y, m - 1, day, hh, mm)
}

export function toIso(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** 09.01.2027 */
export function fmtDate(iso: string): string {
  const d = parse(iso)
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`
}

/** 09.01. */
export function fmtDay(iso: string): string {
  const d = parse(iso)
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.`
}

/** "heute, 09:20" / "Sa 09.01., 16:10" / "Sa 09.01." / "07.11.2026" für andere Jahre */
export function fmtWhen(iso: string): string {
  const d = parse(iso)
  const time = iso.includes('T') ? `, ${pad(d.getHours())}:${pad(d.getMinutes())}` : ''
  if (iso.slice(0, 10) === TODAY) return `heute${time}`
  if (d.getFullYear() !== parse(TODAY).getFullYear()) return fmtDate(iso) + time
  return `${WEEKDAYS[d.getDay()]} ${fmtDay(iso)}${time}`
}

/** Samstag, 23. Januar 2027 */
export function fmtLong(iso: string): string {
  const d = parse(iso)
  return `${WEEKDAYS_LONG[d.getDay()]}, ${d.getDate()}. ${MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

export function daysBetween(fromIso: string, toIsoStr: string): number {
  return Math.round((parse(toIsoStr).getTime() - parse(fromIso).getTime()) / 86400000)
}

export function addDays(iso: string, n: number): string {
  const d = parse(iso)
  d.setDate(d.getDate() + n)
  return toIso(d)
}
