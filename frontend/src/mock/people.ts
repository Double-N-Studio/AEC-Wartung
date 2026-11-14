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

const user = (id: string, name: string, role: Role): User => ({ id, name, role })

/** Test accounts of the mockup. Special accounts are picked in the login popup and sign in with any password. */
export function initialUsers(): User[] {
  return [
    { ...user(TABLET, 'Werkstatt-Tablet', 'wl'), device: true },
    user('MA', 'Matthias Greiner', 'admin'),
    user('HE', 'Heinrich Hoop', 'wl'),
    user('LO', 'Lorenz Dierschke', 'wl'),
    user('JO', 'Jonas Weber', 'user'),
    user('LE', 'Lena Hoffmann', 'user'),
  ]
}
