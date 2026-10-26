import type { Person, PersonKey } from '../types'

export const PEOPLE: Record<PersonKey, Person> = {
  MA: { key: 'MA', name: 'Matze', bg: '#DCE8F7', fg: '#1D4F99' },
  HE: { key: 'HE', name: 'Heinrich', bg: '#FDEBD3', fg: '#8A4B00' },
  JO: { key: 'JO', name: 'Jonas', bg: '#DDF0E6', fg: '#17643F' },
  LE: { key: 'LE', name: 'Lena', bg: '#F8E1E7', fg: '#8E2448' },
  SO: { key: 'SO', name: 'Sophie', bg: '#E0F1F4', fg: '#145F6B' },
  FE: { key: 'FE', name: 'Felix', bg: '#EEE9DC', fg: '#5E4F1F' },
  TI: { key: 'TI', name: 'Tim', bg: '#E6E8EC', fg: '#3A4452' },
  LO: { key: 'LO', name: 'Lorenz', bg: '#E8E2F6', fg: '#4B3592' },
  NU: { key: 'NU', name: 'Nuno', bg: '#E8E2F6', fg: '#4B3592' },
}

/** Personen, die Werkstattleitung übernehmen können. */
export const LEADERS: PersonKey[] = ['MA', 'HE']

export const DEVICE_USER = 'Werkstatt-Tablet'

/** Angemeldetes Konto (im Mockup immer das Werkstatt-Tablet). */
export const CURRENT_USER = DEVICE_USER
