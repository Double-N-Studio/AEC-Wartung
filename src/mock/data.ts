import type { AppState, Task } from '../types'

const ASG = 'asg32'

const polish = (side: string) => [
  { text: `Fläche ${side} mit Wasser und Mikrofasertuch vorreinigen`, done: false },
  { text: 'Insekten- und Fettreste entfernen', done: false },
  { text: 'Politur auftragen und auspolieren', done: false },
]

const created = { text: 'Angelegt', who: 'Heinrich', at: '2027-01-09' }

function done(
  id: string, level: Task['level'], title: string, duration: string, desc: string,
  by: string, at: string, signedBy: string, signedAt: string,
): Task {
  return {
    id, aircraftId: ASG, status: 'erledigt', level, title, duration, desc, checklist: [],
    doneBy: by, doneAt: at, signedBy, signedAt,
    history: [
      { text: 'Abgezeichnet', who: signedBy, at: signedAt },
      { text: 'Als erledigt gemeldet', who: by, at },
      { text: 'Arbeit gestartet', who: by.split(',')[0], at: at.slice(0, 10) },
      created,
    ],
  }
}

/**
 * Im Mockup haben alle Flugzeuge denselben Inhalt wie die ASG32.
 * Die Datensätze werden pro Flugzeug mit eigenen IDs kopiert.
 */
export function initialState(): AppState {
  const s = baseState()
  const own = <T extends { aircraftId: string }>(list: T[]) => list.filter((x) => x.aircraftId === ASG)
  const pre = (id: string, ref?: string) => (ref ? `${id}-${ref}` : undefined)
  for (const a of s.aircraft.filter((x) => x.id !== ASG)) {
    s.tasks.push(...own(s.tasks).map((t) => ({ ...structuredClone(t), id: `${a.id}-${t.id}`, aircraftId: a.id, defectId: pre(a.id, t.defectId) })))
    s.defects.push(...own(s.defects).map((d) => ({ ...structuredClone(d), id: `${a.id}-${d.id}`, aircraftId: a.id, taskId: pre(a.id, d.taskId) })))
    s.deadlines.push(...own(s.deadlines).map((d) => ({ ...structuredClone(d), id: `${a.id}-${d.id}`, aircraftId: a.id })))
    s.documents.push(...own(s.documents).map((d) => ({ ...structuredClone(d), id: `${a.id}-${d.id}`, aircraftId: a.id })))
  }
  return s
}

function baseState(): AppState {
  return {
    counter: 100,

    aircraft: [
      { id: 'ask21', type: 'ASK21', reg: 'D-5071', hasDetails: true, sponsor: 'Heinrich', start: '2026-11-07', end: '2026-12-05' },
      { id: 'ask23', type: 'ASK23', reg: 'D-6987', hasDetails: true, sponsor: 'Matze', start: '2026-11-14', end: '2026-12-12' },
      { id: ASG, type: 'ASG32', reg: 'D-3362', hasDetails: true, serial: '32031', sponsor: 'Lorenz D.', start: '2027-01-09', end: '2027-01-30' },
      { id: 'arcus', type: 'Arcus-T', reg: 'D-KSBN', hasDetails: true, sponsor: 'Felix', start: '2027-02-06', end: '2027-03-13' },
      { id: 'discus', type: 'Discus-2b', reg: 'D-8586', hasDetails: true, sponsor: 'Jonas', start: '2026-12-05', end: '2027-01-09' },
      { id: 'ls8', type: 'LS8', reg: 'D-0169', hasDetails: true, sponsor: 'Sophie', start: '2027-01-16', end: '2027-02-13' },
    ],

    schedule: {
      '2026-12-05': { leader: 'MA', planes: 'Discus-2b · ASK21 Abnahme' },
      '2026-12-12': { leader: 'HE', planes: 'Discus-2b · ASK23 Abnahme' },
      '2026-12-19': { leader: 'MA', planes: 'Discus-2b' },
      '2026-12-26': { closed: true, reason: 'Weihnachten' },
      '2027-01-02': { closed: true, reason: 'Neujahr' },
      '2027-01-09': { leader: 'HE', planes: 'Discus-2b · ASG32' },
      '2027-01-16': { leader: 'MA', planes: 'ASG32 · LS8' },
      '2027-01-23': { leader: null, planes: 'ASG32 · LS8' },
      '2027-01-30': { leader: 'HE', planes: 'ASG32 Abnahme · LS8' },
      '2027-02-06': { leader: 'MA', planes: 'LS8 · Arcus-T' },
      '2027-02-13': { leader: null, planes: 'LS8 Abnahme · Arcus-T' },
      '2027-02-20': { leader: 'HE', planes: 'Arcus-T' },
      '2027-02-27': { leader: 'MA', planes: 'Arcus-T' },
      '2027-03-06': { leader: 'HE', planes: 'Arcus-T' },
      '2027-03-13': { leader: 'MA', planes: 'Arcus-T Abnahme' },
      '2027-03-20': { leader: null, planes: 'Aufrüsten für die Saison' },
      '2027-03-27': { leader: 'HE', planes: 'Saisonstart' },
    },

    tasks: [
      { id: 't1', aircraftId: ASG, status: 'offen', level: 'ein', title: 'Fläche links reinigen und polieren', duration: '~2 h', checklist: polish('links'), desc: 'Linke Fläche oben und unten reinigen und polieren. Politur und Tücher findest du in der Inventur.', history: [created] },
      { id: 't2', aircraftId: ASG, status: 'offen', level: 'ein', title: 'Fläche rechts reinigen und polieren', duration: '~2 h', checklist: polish('rechts'), desc: 'Rechte Fläche oben und unten reinigen und polieren. Politur und Tücher findest du in der Inventur.', history: [created] },
      { id: 't3', aircraftId: ASG, status: 'offen', level: 'ein', title: 'Cockpit aussaugen', duration: '~0,5 h', checklist: [
        { text: 'Sitzschalen ausbauen', done: false },
        { text: 'Rumpfboden aussaugen', done: false },
        { text: 'Gurte und Sitzschalen abwischen', done: false },
        { text: 'Sitzschalen wieder einbauen', done: false },
      ], desc: 'Cockpit vorne und hinten gründlich aussaugen.', history: [created] },
      { id: 't4', aircraftId: ASG, status: 'offen', level: 'erf', title: 'Wasserballast-Ventile reinigen und Dichtheit prüfen', duration: '~1 h', checklist: [], doc: 'Wartungshandbuch', desc: 'Ablassventile ausbauen, reinigen und auf Dichtheit prüfen.', history: [created] },
      { id: 't5', aircraftId: ASG, status: 'offen', level: 'erf', title: 'Seitenruderseile und Umlenkrollen prüfen', duration: '~0,5 h', checklist: [], doc: 'Wartungshandbuch', desc: 'Seile auf Verschleiß und Spannung prüfen, Umlenkrollen auf Leichtgängigkeit.', history: [created] },
      { id: 't6', aircraftId: ASG, status: 'offen', level: 'wl', title: 'Schwerpunktkupplung prüfen (lt. Herstellervorgabe)', duration: '~1 h', checklist: [], deadline: '2027-03-31', doc: 'Wartungshandbuch', desc: 'Prüfung der Schwerpunktkupplung nach Herstellervorgabe. Ergebnis ins Bordbuch eintragen.', history: [created] },
      { id: 't7', aircraftId: ASG, status: 'arbeit', level: 'erf', title: 'Radbremse und Reifen prüfen', duration: '~2 h', checklist: [
        { text: 'Bremsbeläge auf Verschleiß prüfen', done: true },
        { text: 'Reifendruck und Profil prüfen', done: false },
        { text: 'Radlager auf Spiel prüfen', done: false },
      ], defectId: 'm4', desc: 'Bremsbeläge, Reifen und Radlager prüfen. Zum Klackern beim Schieben siehe Mangel.', history: [{ text: 'Arbeit gestartet', who: 'Jonas', at: '2027-01-09' }, created] },
      { id: 't8', aircraftId: ASG, status: 'arbeit', level: 'ein', title: 'Haube polieren', duration: '~1 h', checklist: [], desc: 'Haube innen und außen mit Plexiglas-Politur behandeln. Keine Papiertücher verwenden.', history: [{ text: 'Arbeit gestartet', who: 'Sophie', at: '2027-01-16T09:40' }, created] },
      { id: 't9', aircraftId: ASG, status: 'arbeit', level: 'erf', title: 'GPS-Antenne prüfen', duration: '~1 h', checklist: [], defectId: 'm3', desc: 'Antennenkabel und Stecker prüfen, Empfang mit dem Flarm testen.', history: [{ text: 'Arbeit gestartet', who: 'Felix', at: '2027-01-09' }, created] },
      { id: 't10', aircraftId: ASG, status: 'arbeit', level: 'wl', title: 'Lack-Riss am Höhenleitwerk links ausbessern', duration: '~3 h', checklist: [], defectId: 'm1', desc: 'Riss anschleifen, mit Gelcoat ausbessern und nachpolieren.', history: [{ text: 'Arbeit gestartet', who: 'Heinrich', at: '2027-01-09' }, created] },
      done('t11', 'ein', 'Fallschirme zur Packprüfung abgeben', '~0,5 h', 'Beide Fallschirme zur Packprüfung bringen.', 'Tim', '2027-01-16T09:20', 'Matze', '2027-01-16'),
      done('t12', 'erf', 'Querkraftbolzen neu fetten', '~1 h', 'Querkraftbolzen reinigen und neu fetten.', 'Jonas', '2027-01-09T16:10', 'Heinrich', '2027-01-09'),
      done('t13', 'ein', 'Leitwerk reinigen und polieren', '~2 h', 'Höhen- und Seitenleitwerk reinigen und polieren.', 'Felix', '2027-01-09T15:35', 'Heinrich', '2027-01-09'),
      done('t14', 'ein', 'Instrumentenbrett reinigen', '~1 h', 'Instrumentenbrett und Glas der Instrumente vorsichtig reinigen.', 'Lena', '2027-01-09T14:20', 'Heinrich', '2027-01-09'),
      done('t15', 'erf', 'Bremsklappen reinigen und schmieren', '~2 h', 'Bremsklappenkästen reinigen, Gelenke schmieren.', 'Jonas, Lena', '2027-01-09T13:05', 'Heinrich', '2027-01-09'),
      done('t16', 'erf', 'Batterien: Kapazitätstest', '~1 h', 'Alle Batterien laden und Kapazität messen.', 'Felix', '2027-01-09T12:40', 'Heinrich', '2027-01-09'),
      done('t17', 'ein', 'Rumpf außen reinigen', '~2 h', 'Rumpf außen gründlich reinigen.', 'Sophie', '2027-01-09T11:50', 'Heinrich', '2027-01-09'),
      done('t18', 'ein', 'Abrüsten, Flächen auf Böcke legen', '~1 h', 'Flugzeug abrüsten und Flächen auf die Böcke legen.', 'Tim, Jonas', '2027-01-09T10:05', 'Heinrich', '2027-01-09'),
    ],

    defects: [
      { id: 'm1', aircraftId: ASG, title: 'Lack-Riss Höhenleitwerk links', source: 'befund', photos: 2, reportedAt: '2027-01-09', reportedBy: 'Heinrich', priority: 'Normal', owner: 'Heinrich', status: 'open', taskId: 't10',
        desc: 'Haarriss im Lack an der Nasenleiste, ca. 4 cm lang. Beim Polieren entdeckt.',
        history: [{ text: 'Befund mit 2 Fotos erfasst, Arbeitspaket angelegt.', who: 'Heinrich', at: '2027-01-09' }] },
      { id: 'm2', aircraftId: ASG, title: 'Hauben-Fenster hinten', source: 'vf', photos: 0, reportedAt: '2026-06-04', reportedBy: 'Lorenz', priority: 'Normal', owner: 'Matze', status: 'open',
        desc: 'Die Schiene des hinteren Haubenfensters ist unten gebrochen. Fenster nur mit Vorsicht benutzen.',
        history: [{ text: 'Ersatz ist bestellt, Einbau in der Winterwartung.', who: 'Matze', at: '2027-01-09' }, { text: 'Ersatzschiene beim Hersteller angefragt.', who: 'Matze', at: '2026-06-12' }] },
      { id: 'm3', aircraftId: ASG, title: 'Flarm: Fehlermeldung Antenne B', source: 'vf', photos: 0, reportedAt: '2026-05-11', reportedBy: 'Felix', priority: 'Normal', owner: 'Matze', status: 'open', taskId: 't9',
        desc: 'Flarm meldet einen Fehler an Antenne B. Antennenkabel und Antenne prüfen, ggf. ersetzen.',
        history: [{ text: 'Aus Vereinsflieger übernommen.', who: 'System', at: '2026-05-11' }] },
      { id: 'm4', aircraftId: ASG, title: 'Lager am Hauptfahrwerk schlägt', source: 'vf', photos: 0, reportedAt: '2026-09-21', reportedBy: 'Jonas', priority: 'Niedrig', owner: 'Jonas', status: 'open', taskId: 't7',
        desc: 'Beim Schieben klackt das Hauptfahrwerk einmal pro Umdrehung. Zu Beginn der Winterarbeit prüfen und ggf. das Lager reparieren oder Ersatzteile bestellen.',
        history: [{ text: 'Wird zusammen mit Radbremse und Reifen geprüft.', who: 'Heinrich', at: '2027-01-09' }] },
      { id: 'm5', aircraftId: ASG, title: 'Mückenputzer: Rutschkupplung', source: 'vf', photos: 0, reportedAt: '2026-06-11', reportedBy: 'Felix', priority: 'Niedrig', owner: 'noch niemand', status: 'open',
        desc: 'Die Rutschkupplung am Antrieb des linken Putzflügels ist verschlissen und rutscht beim Einfahren ab ca. 100 km/h.',
        history: [{ text: 'Aus Vereinsflieger übernommen.', who: 'System', at: '2026-06-11' }] },
      { id: 'm6', aircraftId: ASG, title: 'Mikrofon-Schwanenhals hinterer Sitz', source: 'befund', photos: 1, reportedAt: '2026-05-18', reportedBy: 'Lena', priority: 'Sehr niedrig', owner: 'Matze', status: 'open',
        desc: 'Die Buchsen der Schwanenhals-Befestigung sind aus der Bordwand gebrochen. Provisorisch mit Einnietmuttern befestigt und eingeharzt – in der Winterwartung prüfen.',
        history: [{ text: 'Einnietmuttern statt Nieten gesetzt und eingeharzt.', who: 'Matze', at: '2026-08-02' }] },
      { id: 'm7', aircraftId: ASG, title: 'Kratzspuren Haube vorne rechts', source: 'befund', photos: 1, reportedAt: '2025-08-11', reportedBy: 'Sophie', priority: 'Normal', owner: 'Matze', status: 'done', doneAt: '2026-03-08', doneBy: 'Matze',
        desc: 'Rundliche Kratzspuren vorne rechts an der Haube, beim Rundgang gefunden.',
        history: [{ text: 'Mit Schleifpaste rauspoliert.', who: 'Matze', at: '2026-03-08' }] },
      { id: 'm8', aircraftId: ASG, title: 'LX 9000 Softwareupdate', source: 'vf', photos: 0, reportedAt: '2026-03-29', reportedBy: 'Tim', priority: 'Sehr niedrig', owner: 'Felix', status: 'done', doneAt: '2026-04-02', doneBy: 'Felix',
        desc: 'Neue Softwareversion beim Hersteller anfordern (Seriennummer angeben) und aufspielen.',
        history: [{ text: 'Update aufgespielt.', who: 'Felix', at: '2026-04-02' }] },
      { id: 'm9', aircraftId: ASG, title: 'Höhenmesser hinten: kleiner Zeiger falsch', source: 'vf', photos: 0, reportedAt: '2026-06-11', reportedBy: 'Jonas', priority: 'Normal', owner: 'Matze', status: 'done', doneAt: '2026-12-20', doneBy: 'Matze',
        desc: 'Am Boden zeigt der große Zeiger richtig an, der kleine steht auf 600 m.',
        history: [{ text: 'Auf Gewährleistung repariert und wieder eingebaut.', who: 'Matze', at: '2026-12-20' }, { text: 'Zur Reparatur geschickt.', who: 'Matze', at: '2026-11-14' }] },
      { id: 'm10', aircraftId: ASG, title: 'Fahrwerkswarnung ohne Funktion', source: 'vf', photos: 0, reportedAt: '2026-06-11', reportedBy: 'Felix', priority: 'Niedrig', owner: 'Matze', status: 'done', doneAt: '2027-01-04', doneBy: 'Matze',
        desc: 'Die Fahrwerkswarnung funktioniert nicht, der Magnet für den Sensor fehlt.',
        history: [{ text: 'Kein Mangel – so vom Hersteller vorgesehen.', who: 'Matze', at: '2027-01-04' }] },
      { id: 'm11', aircraftId: ASG, title: 'Bordnetz: Spannungsabfall', source: 'vf', photos: 0, reportedAt: '2026-04-29', reportedBy: 'Tim', priority: 'Normal', owner: 'Heinrich', status: 'done', doneAt: '2026-05-16', doneBy: 'Heinrich',
        desc: 'Das Bordnetz bricht zusammen, wenn die Mückenputzer bedient werden.',
        history: [{ text: 'Prüfbericht liegt unter Dokumente. Mückenputzer nur mit Batterie 2 verwenden.', who: 'Heinrich', at: '2026-05-16' }] },
    ],

    deadlines: [
      { id: 'f1', aircraftId: ASG, title: 'TÜV', device: 'Transportanhänger', deviceInfo: 'Kennzeichen FB-OM 320', contact: 'Segelflugreferent', due: '2027-01-31' },
      { id: 'f2', aircraftId: ASG, title: 'Lufttüchtigkeitsprüfung', device: 'Luftfahrzeug', deviceInfo: 'Werknummer 32031', contact: 'Segelflugreferent', delegate: 'Matze', due: '2027-03-06' },
      { id: 'f3', aircraftId: ASG, title: 'Ablauf Gurte', device: 'Luftfahrzeug', deviceInfo: 'Werknummer 32031', contact: 'Segelflugreferent', due: '2028-10-24' },
      { id: 'f4', aircraftId: ASG, title: 'Ablauf Kupplungen', device: 'Luftfahrzeug', deviceInfo: 'Werknummer 32031', contact: 'Segelflugreferent', delegate: 'Matze', startsLeft: 1199 },
    ],

    documents: [
      { id: 'd1', aircraftId: ASG, title: 'Flughandbuch', meta: 'PDF · Ausgabe 01.12.2015', image: 'docs/flughandbuch.png' },
      { id: 'd2', aircraftId: ASG, title: 'Wartungshandbuch', meta: 'PDF · Änderung TM 14 vom 11.04.2023', image: 'docs/wartungshandbuch.png' },
      { id: 'd3', aircraftId: ASG, title: 'Aufbauanleitung', meta: 'PDF · Version 1.0 (2016)', image: 'docs/aufbauanleitung.webp' },
      { id: 'd4', aircraftId: ASG, title: 'Gewichtsübersicht', meta: 'PDF · Wägung vom 04.03.2023', image: 'docs/gewichtsuebersicht.webp' },
    ],

    inventory: [
      { id: 'v1', kind: 'vs', name: 'Waschbenzin', location: 'Gefahrstoffschrank, unten links', mode: 'count', qty: 0, unit: ['l', 'l'], history: [{ text: 'Gezählt: 0 l', who: 'Heinrich', at: '2027-01-16' }] },
      { id: 'v2', kind: 'vs', name: 'Mehrzweckfett', location: 'Werkbank links, Schublade 2', mode: 'flag', qty: 0, unit: ['', ''], history: [{ text: 'Gezählt: leer', who: 'Matze', at: '2027-01-16' }] },
      { id: 'v3', kind: 'vs', name: 'Mikrofasertücher', location: 'Regal A, Fach 1', mode: 'flag', qty: 0, unit: ['', ''], history: [{ text: 'Gezählt: leer', who: 'Matze', at: '2027-01-16' }] },
      { id: 'v4', kind: 'vs', name: 'Politur', location: 'Regal A, Fach 2', mode: 'count', qty: 2, unit: ['Dose', 'Dosen'], history: [] },
      { id: 'v5', kind: 'vs', name: 'Aceton', location: 'Gefahrstoffschrank, oben', mode: 'count', qty: 4, unit: ['Flasche', 'Flaschen'], history: [] },
      { id: 'v6', kind: 'vs', name: 'Kabelbinder', location: 'Kleinteilekasten A', mode: 'count', qty: 150, unit: ['Stk.', 'Stk.'], history: [] },
      { id: 'v7', kind: 'vs', name: 'Sprühöl', location: 'Werkbank links, Schublade 1', mode: 'count', qty: 5, unit: ['Dose', 'Dosen'], history: [] },
      { id: 'v8', kind: 'vs', name: 'Sicherungsdraht', location: 'Werkstattleiter-Schrank', mode: 'count', qty: 2, unit: ['Rolle', 'Rollen'], history: [] },
      { id: 'e1', kind: 'et', name: 'Reifenschlauch 4.00-4', location: 'Ersatzteilschrank, Fach 3', mode: 'count', qty: 0, unit: ['Stk.', 'Stk.'], fits: 'ASK21, ASK23, LS8', history: [{ text: 'Gezählt: 0 Stk.', who: 'Nuno', at: '2027-01-16' }] },
      { id: 'e2', kind: 'et', name: 'Bremsbeläge', location: 'Ersatzteilschrank, Fach 5', mode: 'count', qty: 0, unit: ['Satz', 'Satz'], fits: 'ASG32', history: [{ text: 'Gezählt: 0 Satz', who: 'Heinrich', at: '2027-01-09' }] },
      { id: 'e3', kind: 'et', name: 'Dichtungssatz Wasserballast', location: 'Ersatzteilschrank, Fach 5', mode: 'count', qty: 0, unit: ['Satz', 'Satz'], fits: 'ASG32', history: [{ text: 'Gezählt: 0 Satz', who: 'Heinrich', at: '2027-01-09' }] },
      { id: 'e4', kind: 'et', name: 'Ölfilter', location: 'Motorschrank', mode: 'count', qty: 2, unit: ['Stk.', 'Stk.'], fits: 'Arcus-T', history: [] },
      { id: 'e5', kind: 'et', name: 'Batterie 12 V', location: 'Ladeecke', mode: 'count', qty: 3, unit: ['Stk.', 'Stk.'], fits: 'alle Flugzeuge', history: [] },
      { id: 'e6', kind: 'et', name: 'Spornrad', location: 'Ersatzteilschrank, Fach 1', mode: 'count', qty: 1, unit: ['Stk.', 'Stk.'], fits: 'ASK21, ASK23', history: [] },
      { id: 'e7', kind: 'et', name: 'Kugelgelenk', location: 'Kleinteilekasten B', mode: 'count', qty: 2, unit: ['Stk.', 'Stk.'], fits: 'LS8', history: [] },
      { id: 'e8', kind: 'et', name: 'Bremsseil Radbremse', location: 'Ersatzteilschrank, Fach 2', mode: 'count', qty: 1, unit: ['Stk.', 'Stk.'], fits: 'Discus-2b, LS8', history: [] },
      { id: 'e9', kind: 'et', name: 'Zündkerzen', location: 'Motorschrank', mode: 'count', qty: 4, unit: ['Stk.', 'Stk.'], fits: 'Arcus-T', history: [] },
    ],

    orders: [
      { id: 'o1', itemId: 'v1', name: 'Waschbenzin', forWhat: 'Lager', state: 'list', reportedBy: 'Heinrich', reportedAt: '2027-01-16', comment: '2 Kanister à 5 l. Nur im Gefahrstoffschrank lagern.', history: [{ text: 'Auf Bestellliste gesetzt', who: 'Heinrich', at: '2027-01-16' }] },
      { id: 'o2', name: 'Schleifpapier P800', forWhat: 'Lager', state: 'list', reportedBy: 'Werkstatt-Tablet', reportedAt: '2027-01-16', comment: '50 Bogen, nass. Gerne gleich P1000 mitbestellen.', history: [{ text: 'Auf Bestellliste gesetzt', who: 'Werkstatt-Tablet', at: '2027-01-16' }] },
      { id: 'o3', itemId: 'e1', name: 'Reifenschlauch 4.00-4', forWhat: 'LS8', state: 'list', reportedBy: 'Nuno', reportedAt: '2027-01-16', comment: '1 Stück mit gewinkeltem Ventil.', history: [{ text: 'Auf Bestellliste gesetzt', who: 'Nuno', at: '2027-01-16' }] },
      { id: 'o4', itemId: 'e3', name: 'Dichtungssatz Wasserballast', forWhat: 'ASG32', state: 'ordered', reportedBy: 'Heinrich', reportedAt: '2027-01-09', delivery: '2027-01-20', comment: '1 Satz, bestellt am 12.01. von Heinrich.', history: [{ text: 'Bestellt', who: 'Heinrich', at: '2027-01-12' }, { text: 'Auf Bestellliste gesetzt', who: 'Heinrich', at: '2027-01-09' }] },
      { id: 'o5', itemId: 'e2', name: 'Bremsbeläge', forWhat: 'ASG32', state: 'ordered', reportedBy: 'Heinrich', reportedAt: '2027-01-09', delivery: '2027-01-22', comment: '1 Satz, bestellt am 13.01. von Heinrich.', history: [{ text: 'Bestellt', who: 'Heinrich', at: '2027-01-13' }, { text: 'Auf Bestellliste gesetzt', who: 'Heinrich', at: '2027-01-09' }] },
    ],
  }
}
