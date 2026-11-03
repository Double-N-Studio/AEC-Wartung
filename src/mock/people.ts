import type { Role, User } from '../types'

export const TABLET = 'tablet'
/** Absender von Einträgen, die aus Vereinsflieger übernommen wurden. */
export const SYSTEM = 'system'

/** Sonderkonten (Werkstattleitung, Admin, Tablet) melden sich mit Passwort an, Mitglieder nur mit Namen. */
export const needsPassword = (u: User) => !!u.device || u.role !== 'user'

export const ROLE_LABELS: Record<Role, string> = {
  admin: 'Admin',
  wl: 'Werkstattleiter',
  user: 'Mitglied',
}

const user = (id: string, name: string, role: Role): User => ({
  id, name, role,
  ...(role === 'user' ? {} : { email: `${name.toLowerCase().replace(/ /g, '.')}@example.org` }),
})

/** Testkonten des Mockups. Sonderkonten melden sich mit vorname.nachname@example.org und beliebigem Passwort an. */
export function initialUsers(): User[] {
  return [
    { ...user(TABLET, 'Werkstatt-Tablet', 'wl'), email: 'werkstatt@example.org', device: true },
    user('MA', 'Matthias Greiner', 'admin'),
    user('HE', 'Heinrich Hoop', 'wl'),
    user('LO', 'Lorenz Dierschke', 'wl'),
    user('JO', 'Jonas Weber', 'user'),
    user('LE', 'Lena Hoffmann', 'user'),
  ]
}
