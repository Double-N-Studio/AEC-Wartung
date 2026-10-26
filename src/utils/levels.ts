import type { Level } from '../types'

export const LEVELS: Record<Level, { label: string; long: string; bg: string; fg: string; bars: number }> = {
  ein: { label: 'Einsteiger', long: 'Einsteiger & Flugschüler', bg: 'var(--green-soft)', fg: 'var(--green-ink)', bars: 1 },
  erf: { label: 'Erfahren', long: 'Erfahren', bg: 'var(--accent-soft)', fg: 'var(--accent-ink)', bars: 2 },
  wl: { label: 'Nur WL/Prüfer', long: 'Nur Werkstattleiter/Prüfer', bg: 'var(--orange-soft)', fg: 'var(--orange-ink)', bars: 3 },
}

export const LEVEL_KEYS: Level[] = ['ein', 'erf', 'wl']
