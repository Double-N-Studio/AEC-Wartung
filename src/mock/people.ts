import type { Role, User } from '../types'

export const TABLET = 'tablet'
/** Absender von Einträgen, die aus Vereinsflieger übernommen wurden. */
export const SYSTEM = 'system'

export const ROLE_LABELS: Record<Role, string> = {
  admin: 'Admin',
  wl: 'Werkstattleiter',
  user: 'Mitglied',
}

/** Avatar-Farben für neue Konten, der Reihe nach vergeben. */
export const AVATAR_COLORS: [string, string][] = [
  ['#DCE8F7', '#1D4F99'], ['#FDEBD3', '#8A4B00'], ['#DDF0E6', '#17643F'], ['#F8E1E7', '#8E2448'],
  ['#E0F1F4', '#145F6B'], ['#EEE9DC', '#5E4F1F'], ['#E6E8EC', '#3A4452'], ['#E8E2F6', '#4B3592'],
]

const user = (id: string, name: string, role: Role, color: number): User => ({
  id, name, role, bg: AVATAR_COLORS[color][0], fg: AVATAR_COLORS[color][1],
  ...(role === 'user' ? {} : { email: `${name.toLowerCase().replace(/ /g, '.')}@example.org` }),
})

/** Testkonten des Mockups. Sonderkonten melden sich mit vorname.nachname@example.org und beliebigem Passwort an. */
export function initialUsers(): User[] {
  return [
    { ...user(TABLET, 'Werkstatt-Tablet', 'wl', 0), email: 'werkstatt@example.org', device: true },
    user('MA', 'Matthias Greiner', 'admin', 0),
    user('HE', 'Heinrich Hoop', 'wl', 1),
    user('LO', 'Lorenz Dierschke', 'wl', 7),
    user('JO', 'Jonas Weber', 'user', 2),
    user('LE', 'Lena Hoffmann', 'user', 3),
  ]
}
