import type { Role, User } from '../types'

export const TABLET = 'tablet'
/** Author of entries that were taken over from Vereinsflieger. */
export const SYSTEM = 'system'

/** Special accounts (workshop lead, admin, tablet) sign in with a password, members only with their name. */
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

/** Test accounts of the mockup. Special accounts sign in with vorname.nachname@example.org and any password. */
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
