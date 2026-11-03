import type { Aircraft, AppState, ArchivedSeason, FileRef, Task } from '../types'
import { addDays, today } from '../utils/date'
import { initialUsers, SYSTEM, TABLET } from './people'

const ASG = 'asg32'

/** Sample photos without a file – the app shows placeholders for them. */
const demoPhotos = (key: string, n: number): FileRef[] =>
  Array.from({ length: n }, (_, i) => ({ id: `demo-${key}-${i + 1}`, name: `Foto ${i + 1}.jpg`, type: 'image/jpeg', size: 0 }))

const created = { text: 'Angelegt', who: 'HE', at: '2027-01-09' }
// Document ID of the maintenance manual
const WHB = 'd2'

function pkg(
  id: string, level: Task['level'], title: string, duration: string, desc: string,
  checklist: string[] = [], extra: Partial<Task> = {},
): Task {
  return {
    id, aircraftId: ASG, status: 'offen', level, title, duration, desc,
    checklist: checklist.map((text) => ({ text, done: false })),
    history: [created], ...extra,
  }
}

/**
 * In the mockup all aircraft have the same content as the ASG32.
 * The records are copied per aircraft with their own IDs.
 */
export function initialState(): AppState {
  const s = baseState()
  const own = <T extends { aircraftId?: string }>(list: T[]) => list.filter((x) => x.aircraftId === ASG)
  const pre = (id: string, ref?: string) => (ref ? `${id}-${ref}` : undefined)
  // Templates = cards of the ASG32, valid for all aircraft; every card remembers its template.
  s.templates = own(s.tasks).map((t) => ({
    id: `v-${t.id}`, aircraftType: '', level: t.level, title: t.title, desc: t.desc, duration: t.duration,
    checklist: t.checklist.map((c) => c.text), docTitle: s.documents.find((d) => d.id === t.docId)?.title,
  }))
  own(s.tasks).forEach((t) => { t.templateId = `v-${t.id}` })
  for (const a of s.aircraft.filter((x) => x.id !== ASG)) {
    s.tasks.push(...own(s.tasks).map((t) => ({ ...structuredClone(t), id: `${a.id}-${t.id}`, aircraftId: a.id, defectId: pre(a.id, t.defectId), docId: pre(a.id, t.docId) })))
    s.defects.push(...own(s.defects).map((d) => ({ ...structuredClone(d), id: `${a.id}-${d.id}`, aircraftId: a.id, taskId: pre(a.id, d.taskId) })))
    s.deadlines.push(...own(s.deadlines).map((d) => ({ ...structuredClone(d), id: `${a.id}-${d.id}`, aircraftId: a.id })))
    s.documents.push(...own(s.documents).map((d) => ({ ...structuredClone(d), id: `${a.id}-${d.id}`, aircraftId: a.id })))
  }
  // So the board looks different per aircraft: completed aircraft fully done,
  // ASG32 and LS8 mixed, Arcus-T not started at all yet.
  for (const a of s.aircraft) {
    const tasks = s.tasks.filter((t) => t.aircraftId === a.id)
    if (a.end < today()) completeAll(s, a, tasks)
    else if (a.id === ASG) tasks.forEach((t) => applyAsg(t))
    else if (a.id === 'ls8') tasks.forEach((t) => applyLs8(t))
    else tasks.forEach((t) => resetTask(t))
    if (a.id !== ASG) tasks.forEach((t) => { t.history[t.history.length - 1] = { ...created, at: a.start < today() ? a.start : today() } })
  }
  s.archive = [previousSeason(s)]
  return s
}

/** Previous year for reference: same aircraft and templates 52 weeks earlier, everything done and signed off. */
function previousSeason(s: AppState): ArchivedSeason {
  const back = (iso: string) => addDays(iso, -364)
  const aircraft = s.aircraft.map(({ id, type, reg, start, end }) => ({ id, type, reg, start: back(start), end: back(end) }))
  const tasks: Task[] = []
  for (const a of aircraft) {
    const days: string[] = []
    for (let d = a.start; d <= a.end; d = addDays(d, 7)) days.push(d)
    s.templates.forEach((v, i) => {
      const t: Task = {
        id: `alt-${a.id}-${v.id}`, aircraftId: a.id, templateId: v.id, status: 'offen', level: v.level, title: v.title, desc: v.desc,
        duration: v.duration, checklist: v.checklist.map((text) => ({ text, done: false })), history: [],
      }
      const day = days[Math.floor((i * days.length) / s.templates.length)]
      finishAt(t, HELPERS[i % HELPERS.length], `${day}T${String(10 + (i % 7)).padStart(2, '0')}:15`, i % 2 ? 'HE' : 'MA')
      t.history[t.history.length - 1] = { ...created, at: a.start }
      tasks.push(t)
    })
  }
  const schedule = Object.fromEntries(Object.entries(s.schedule).map(([d, day]) => [back(d), { leader: day.leader, closed: day.closed, reason: day.reason }]))
  return { id: 'saison-2025', label: '2025/26', start: back(s.season.start), end: back(s.season.end), aircraft, tasks, schedule, closedAt: addDays(s.season.start, -30), closedBy: 'MA' }
}

const HELPERS = ['JO', 'LE']

function resetTask(t: Task) {
  t.status = 'offen'
  t.checklist.forEach((c) => { c.done = false })
  delete t.doneBy
  delete t.doneAt
  delete t.signedBy
  delete t.signedAt
  t.history = [created]
}

function startAt(t: Task, who: string, at: string) {
  t.status = 'arbeit'
  t.history = [{ text: 'Arbeit gestartet', who, at }, created]
}

function finishAt(t: Task, who: string, at: string, signedBy?: string) {
  t.status = 'erledigt'
  t.checklist.forEach((c) => { c.done = true })
  t.doneBy = who
  t.doneAt = at
  t.history = [{ text: 'Als erledigt gemeldet', who, at }, { text: 'Arbeit gestartet', who, at: at.slice(0, 10) }, created]
  if (signedBy) {
    t.signedBy = signedBy
    t.signedAt = at.slice(0, 10)
    t.history.unshift({ text: 'Abgezeichnet', who: signedBy, at: t.signedAt })
  } else {
    delete t.signedBy
    delete t.signedAt
  }
}

/** All packages done and signed off, spread across the aircraft's workshop days, with their defects fixed. */
function completeAll(s: AppState, a: Aircraft, tasks: Task[]) {
  const days: string[] = []
  for (let d = a.start; d <= a.end; d = addDays(d, 7)) if (!s.schedule[d]?.closed) days.push(d)
  tasks.forEach((t, i) => {
    const day = days[Math.floor((i * days.length) / tasks.length)]
    const leader = s.schedule[day]?.leader
    const at = `${day}T${String(10 + (i % 7)).padStart(2, '0')}:${i % 2 ? '45' : '15'}`
    finishAt(t, HELPERS[i % HELPERS.length], at, leader ?? (i % 2 ? 'HE' : 'MA'))
    const defect = s.defects.find((d) => d.id === t.defectId)
    if (defect) {
      defect.status = 'done'
      defect.doneAt = day
      defect.doneBy = t.doneBy
      defect.history.unshift({ text: 'Mit der Kanban-Karte behoben.', who: t.doneBy!, at: day })
    }
  })
}

const tick = (t: Task, n: number) => t.checklist.slice(0, n).forEach((c) => { c.done = true })

/** ASG32: the first workshop day was 09.01., today is the second. */
function applyAsg(t: Task) {
  const day1 = '2027-01-09'
  const doneDay1: Record<string, [string, string]> = {
    an1: ['LE', '10:05'], fl1: ['JO', '11:50'], ru1: ['LE', '12:40'], hl1: ['LE', '13:05'],
    fl2: ['JO', '14:20'], ru2: ['JO', '15:35'], hl2: ['JO', '16:10'],
  }
  if (doneDay1[t.id]) finishAt(t, doneDay1[t.id][0], `${day1}T${doneDay1[t.id][1]}`, 'HE')
  else if (t.id === 'an2') finishAt(t, 'LE', `${today()}T09:20`, 'MA')
  else if (t.id === 'ru3') { startAt(t, 'HE', day1); tick(t, 1) }
  else if (t.id === 'ru4') {
    startAt(t, 'JO', day1)
    tick(t, 1)
    t.notes = [{ id: 'n1', text: 'Linkes Radlager hat deutlich Spiel, daher das Klackern. Ersatzlager muss bestellt werden.', photos: demoPhotos('n1', 2), who: 'JO', at: `${day1}T15:20` }]
  }
  else if (t.id === 'ru8') { startAt(t, 'JO', day1); tick(t, 1) }
  else if (t.id === 'hl3') startAt(t, 'LE', `${today()}T09:40`)
  else if (t.id === 'fl3') { startAt(t, 'LO', `${today()}T09:50`); tick(t, 1) }
}

/** LS8: the first workshop day is today. */
function applyLs8(t: Task) {
  const id = t.id.replace('ls8-', '')
  resetTask(t)
  if (id === 'an1') finishAt(t, 'LE', `${today()}T10:10`, 'MA')
  else if (id === 'hl1') finishAt(t, 'LO', `${today()}T10:55`)
  else if (id === 'ru1') { startAt(t, 'LE', `${today()}T10:30`); tick(t, 2) }
  else if (id === 'fl1') startAt(t, 'JO', `${today()}T10:40`)
  else if (id === 'an4') startAt(t, 'LE', `${today()}T11:05`)
  else if (id === 'fl2') startAt(t, 'JO', `${today()}T11:20`)
}

function baseState(): AppState {
  return {
    users: initialUsers(),

    season: { label: '2026/27', start: '2026-11-07', end: '2027-03-27' },

    aircraft: [
      { id: 'ask21', type: 'ASK21', reg: 'D-5071', manager: 'MA', start: '2026-11-07', end: '2026-12-05' },
      { id: 'ask23', type: 'ASK23', reg: 'D-6987', start: '2026-11-14', end: '2026-12-12' },
      { id: ASG, type: 'ASG32', reg: 'D-3362', serial: '32031', manager: 'LO', start: '2027-01-09', end: '2027-01-30' },
      { id: 'arcus', type: 'Arcus-T', reg: 'D-KSBN', start: '2027-02-06', end: '2027-03-13' },
      { id: 'discus', type: 'Discus-2b', reg: 'D-9596', start: '2026-12-05', end: '2027-01-09' },
      { id: 'ls8', type: 'LS8', reg: 'D-0169', start: '2027-01-16', end: '2027-02-13' },
    ],

    schedule: {
      '2026-11-07': { leader: 'MA' },
      '2026-11-14': { leader: 'HE' },
      '2026-11-21': { leader: 'MA' },
      '2026-11-28': { leader: 'LO' },
      '2026-12-05': { leader: 'MA' },
      '2026-12-12': { leader: 'HE' },
      '2026-12-19': { leader: 'MA' },
      '2026-12-26': { closed: true, reason: 'Weihnachten' },
      '2027-01-02': { closed: true, reason: 'Neujahr' },
      '2027-01-09': { leader: 'HE' },
      '2027-01-16': { leader: 'MA' },
      '2027-01-23': { leader: 'LO', comment: 'Lorenz übernimmt Werkstattleitung. Einfache Aufgaben in Kanban abarbeiten bitte.\n\n– Matthias', history: [{ text: 'Kommentar geändert', who: 'MA', at: '2027-01-14T19:30' }] },
      '2027-01-30': { leader: 'HE' },
      '2027-02-06': { leader: 'MA' },
      '2027-02-13': { leader: null },
      '2027-02-20': { leader: 'HE' },
      '2027-02-27': { leader: 'MA' },
      '2027-03-06': { leader: 'HE' },
      '2027-03-13': { leader: 'MA' },
    },

    templates: [],
    archive: [],
    vereinsflieger: { lastSync: `${today()}T06:00` },

    tasks: [
      // Wings
      pkg('fl1', 'ein', 'Flügel: Putzen', '~2 h', 'Mit Spüliwasser putzen, auch die Bremsklappen und den Bremsklappenkasten.'),
      pkg('fl2', 'ein', 'Flügel: Entfetten und Klebereste entfernen', '~1 h', 'Fett und Klebereste mit Waschbenzin entfernen.'),
      pkg('fl3', 'erf', 'Flügel: Zustand prüfen', '~2 h', 'Flügel inkl. Querruder und Bremsklappen prüfen. Gefundene Mängel zuerst beheben, bevor es weitergeht.', [
        'Lack und Beschädigungen prüfen',
        'Querruder-Sandwichschale auf Druckstellen prüfen (druckempfindlich, bei Druckstellen das Wartungshandbuch konsultieren)',
        'Lagerung auf Korrosion und Verklemmen prüfen: an jedem Hebel mit 25 kg nach hinten ziehen und dabei einfahren',
      ], { docId: WHB }),
      pkg('fl4', 'erf', 'Flügel: Polieren', '~3 h', 'Mit Rotationsmaschine und feiner Schleifpolitur polieren.'),
      pkg('fl5', 'erf', 'Flügel: Bänder prüfen', '~1,5 h', 'Gewebe-, Abdicht- und Zackenbänder prüfen und bei Bedarf erneuern.', [
        'Gewebe- und Abdichtbänder prüfen, ggf. erneuern (Wartungshandbuch 4.2.2.1)',
        'Zackenband auf der Flügelunterseite prüfen, ggf. erneuern',
      ], { docId: WHB }),
      pkg('fl6', 'ein', 'Flügel: Wachsen', '~2 h', 'Wachs mit Watte auftragen, nach der Ablüftzeit mit Mikrofasertuch abpolieren.'),
      pkg('fl7', 'erf', 'Flügel: Buchsen fetten', '~0,5 h', 'Hauptbolzenbuchsen, Querkraftbolzen und die Kugeln der Ruderanschlüsse fetten.'),
      pkg('fl8', 'ein', 'Flügel: Wassersäcke prüfen', '~0,5 h', 'Wassersäcke auf Dichtigkeit prüfen.'),
      // Fuselage
      pkg('ru1', 'ein', 'Rumpf: Putzen', '~2 h', 'Rumpf innen und außen reinigen, Sitzwanne ausbauen.', [
        'Rumpf aussaugen, Schwerpunkt- und Bugkupplung mit Druckluft ausblasen',
        'Lack und Innenraum mit Spüliwasser wischen, Hydraulikölflecken mit Waschbenzin entfernen',
        'Sitzwanne ausbauen',
      ]),
      pkg('ru2', 'ein', 'Rumpf: Entfetten und Klebereste entfernen', '~1 h', 'Hauptbolzen, Querkraftbuchsen und die Kupplung der Ruderanschlüsse entfetten, alle Klebereste entfernen. Nur Waschbenzin verwenden, kein Aceton auf Lack.'),
      pkg('ru3', 'wl', 'Rumpf: Zustand prüfen', '~2 h', 'Rumpf inkl. Haubennotabwurf und SL-Bänder prüfen. Gefundene Mängel zuerst beheben.', [
        'Lack und Beschädigungen prüfen',
        'Haubennotabwurf und Rögerhaken prüfen (Wartungshandbuch 4.9)',
        'Spaltabklebungen an Höhen- und Seitenruder prüfen, ggf. erneuern (4.2.3 und 4.2.4)',
      ], { docId: WHB }),
      pkg('ru4', 'erf', 'Rumpf: Fahrwerk', '~2 h', 'Fahrwerk reinigen, schmieren und prüfen. Zum Klackern beim Schieben siehe Mangel.', [
        'Fahrwerkskasten reinigen, alle Gelenke mit Maschinenöl schmieren',
        'Verknievorspannung prüfen: 12–15 kg',
        'Gummi-Federelemente auf Verformung und Ablösung prüfen',
      ], { defectId: 'm4' }),
      pkg('ru5', 'erf', 'Rumpf: Polieren', '~2 h', 'Mit Rotationsmaschine und feiner Schleifpolitur polieren.'),
      pkg('ru6', 'ein', 'Rumpf: Wachsen', '~1,5 h', 'Wachs mit Watte auftragen, nach der Ablüftzeit mit Mikrofasertuch abpolieren.'),
      pkg('ru7', 'erf', 'Rumpf: Fetten und Schmieren', '~0,5 h', 'Bolzen und Buchsen fetten, Kupplungen schmieren.', [
        'Hauptbolzen, Querkraftbuchsen und die Kupplung der Ruderanschlüsse fetten',
        'Bug- und Schwerpunktkupplung mit Sprühöl schmieren',
      ]),
      pkg('ru8', 'erf', 'Rumpf: Batterien und Avionik', '~2 h', 'Stromsystem und Batterien prüfen, Software aktualisieren. Zur Flarm-Fehlermeldung siehe Mangel.', [
        'Stromsystem durchtesten',
        'Updates für LX und Flarm einspielen',
        'Batteriekapazität messen und mit Labelmaker aufkleben',
      ], { defectId: 'm3' }),
      pkg('ru9', 'wl', 'Rumpf: Sitzwanne einbauen', '~0,5 h', 'Erst nach der Fremdkörperkontrolle durch befugtes Personal einbauen.'),
      // Horizontal stabiliser
      pkg('hl1', 'ein', 'Höhenleitwerk: Putzen', '~0,5 h', 'Mit Spüliwasser putzen.'),
      pkg('hl2', 'erf', 'Höhenleitwerk: Entfetten und Klebereste entfernen', '~0,5 h', 'Klebereste und Fett in den Buchsen entfernen, nur Waschbenzin verwenden. Danach die Buchsen neu fetten.'),
      pkg('hl3', 'erf', 'Höhenleitwerk: Bänder prüfen', '~1 h', 'Spaltabklebungen prüfen, ggf. erneuern (Wartungshandbuch 4.2.3 und 4.2.4).', [], { docId: WHB }),
      pkg('hl4', 'erf', 'Höhenleitwerk: Polieren und Wachsen', '~1,5 h', 'Mit Rotationsmaschine und feiner Schleifpolitur polieren, danach wachsen.'),
      // Trailer
      pkg('an1', 'ein', 'Anhänger: Aussaugen und Auswischen', '~1 h', 'Anhänger und Teppich aussaugen, danach auswischen.'),
      pkg('an2', 'ein', 'Anhänger: Teppich prüfen', '~0,5 h', 'Teppich kontrollieren, ggf. erneuern.'),
      pkg('an3', 'ein', 'Anhänger: Stauraum und Gasfedern', '~0,5 h', 'Stauraum vorne aussaugen und auswischen. Darin sollen liegen: Kopie des Fahrzeugscheins, Ersatzreifen, Wagenheber und Radmutterschlüssel.'),
      pkg('an4', 'ein', 'Anhänger: Außen putzen', '~1,5 h', 'Außen mit dem Hochdruckreiniger abdampfen, restlichen Dreck mit Schwamm und Wasser entfernen.'),
      pkg('an5', 'ein', 'Anhänger: Wachsen', '~1,5 h', 'Außen mit Autowachs versiegeln.'),
      pkg('an6', 'erf', 'Anhänger: Reifen prüfen', '~0,5 h', 'Reifendruck und Reifenalter prüfen, vor dem TÜV-Termin.', [
        'Reifendruck in allen Reifen prüfen',
        'Reifenalter prüfen: beim 100er-Hänger höchstens 6 Jahre, beim 80er-Hänger Tausch alle 10 Jahre',
      ], { deadline: '2027-01-31' }),
    ],

    defects: [
      { id: 'm1', aircraftId: ASG, title: 'Lack-Riss Höhenleitwerk links', source: 'befund', photos: demoPhotos('m1', 2), reportedAt: '2027-01-09', reportedBy: 'HE', priority: 'Normal', owner: 'HE', status: 'open',
        desc: 'Haarriss im Lack an der Nasenleiste, ca. 4 cm lang. Beim Polieren entdeckt.',
        history: [{ text: 'Befund mit 2 Fotos erfasst.', who: 'HE', at: '2027-01-09' }] },
      { id: 'm2', aircraftId: ASG, title: 'Hauben-Fenster hinten', source: 'vf', photos: [], reportedAt: '2026-06-04', reportedBy: 'LO', priority: 'Normal', owner: 'MA', status: 'open',
        desc: 'Die Schiene des hinteren Haubenfensters ist unten gebrochen. Fenster nur mit Vorsicht benutzen.',
        history: [{ text: 'Ersatz ist bestellt, Einbau in der Winterwartung.', who: 'MA', at: '2027-01-09' }, { text: 'Ersatzschiene beim Hersteller angefragt.', who: 'MA', at: '2026-06-12' }] },
      { id: 'm3', aircraftId: ASG, title: 'Flarm: Fehlermeldung Antenne B', source: 'vf', photos: [], reportedAt: '2026-05-11', reportedBy: 'JO', priority: 'Normal', owner: 'MA', status: 'open', taskId: 'ru8',
        desc: 'Flarm meldet einen Fehler an Antenne B. Antennenkabel und Antenne prüfen, ggf. ersetzen.',
        history: [{ text: 'Aus Vereinsflieger übernommen.', who: SYSTEM, at: '2026-05-11' }] },
      { id: 'm4', aircraftId: ASG, title: 'Lager am Hauptfahrwerk schlägt', source: 'vf', photos: [], reportedAt: '2026-09-21', reportedBy: 'JO', priority: 'Niedrig', owner: 'JO', status: 'open', taskId: 'ru4',
        desc: 'Beim Schieben klackt das Hauptfahrwerk einmal pro Umdrehung. Zu Beginn der Winterarbeit prüfen und ggf. das Lager reparieren oder Ersatzteile bestellen.',
        history: [{ text: 'Wird zusammen mit dem Fahrwerk geprüft.', who: 'HE', at: '2027-01-09' }] },
      { id: 'm5', aircraftId: ASG, title: 'Mückenputzer: Rutschkupplung', source: 'vf', photos: [], reportedAt: '2026-06-11', reportedBy: 'JO', priority: 'Niedrig', owner: null, status: 'open',
        desc: 'Die Rutschkupplung am Antrieb des linken Putzflügels ist verschlissen und rutscht beim Einfahren ab ca. 100 km/h.',
        history: [{ text: 'Aus Vereinsflieger übernommen.', who: SYSTEM, at: '2026-06-11' }] },
      { id: 'm6', aircraftId: ASG, title: 'Mikrofon-Schwanenhals hinterer Sitz', source: 'befund', photos: demoPhotos('m6', 1), reportedAt: '2026-05-18', reportedBy: 'LE', priority: 'Sehr niedrig', owner: 'MA', status: 'open',
        desc: 'Die Buchsen der Schwanenhals-Befestigung sind aus der Bordwand gebrochen. Provisorisch mit Einnietmuttern befestigt und eingeharzt – in der Winterwartung prüfen.',
        history: [{ text: 'Einnietmuttern statt Nieten gesetzt und eingeharzt.', who: 'MA', at: '2026-08-02' }] },
      { id: 'm7', aircraftId: ASG, title: 'Kratzspuren Haube vorne rechts', source: 'befund', photos: demoPhotos('m7', 1), reportedAt: '2025-08-11', reportedBy: 'LE', priority: 'Normal', owner: 'MA', status: 'done', doneAt: '2026-03-08', doneBy: 'MA',
        desc: 'Rundliche Kratzspuren vorne rechts an der Haube, beim Rundgang gefunden.',
        history: [{ text: 'Mit Schleifpaste rauspoliert.', who: 'MA', at: '2026-03-08' }] },
      { id: 'm8', aircraftId: ASG, title: 'LX 9000 Softwareupdate', source: 'vf', photos: [], reportedAt: '2026-03-29', reportedBy: 'LE', priority: 'Sehr niedrig', owner: 'JO', status: 'done', doneAt: '2026-04-02', doneBy: 'JO',
        desc: 'Neue Softwareversion beim Hersteller anfordern (Seriennummer angeben) und aufspielen.',
        history: [{ text: 'Update aufgespielt.', who: 'JO', at: '2026-04-02' }] },
      { id: 'm9', aircraftId: ASG, title: 'Höhenmesser hinten: kleiner Zeiger falsch', source: 'vf', photos: [], reportedAt: '2026-06-11', reportedBy: 'JO', priority: 'Normal', owner: 'MA', status: 'done', doneAt: '2026-12-20', doneBy: 'MA',
        desc: 'Am Boden zeigt der große Zeiger richtig an, der kleine steht auf 600 m.',
        history: [{ text: 'Auf Gewährleistung repariert und wieder eingebaut.', who: 'MA', at: '2026-12-20' }, { text: 'Zur Reparatur geschickt.', who: 'MA', at: '2026-11-14' }] },
      { id: 'm10', aircraftId: ASG, title: 'Fahrwerkswarnung ohne Funktion', source: 'vf', photos: [], reportedAt: '2026-06-11', reportedBy: 'JO', priority: 'Niedrig', owner: 'MA', status: 'done', doneAt: '2027-01-04', doneBy: 'MA',
        desc: 'Die Fahrwerkswarnung funktioniert nicht, der Magnet für den Sensor fehlt.',
        history: [{ text: 'Kein Mangel – so vom Hersteller vorgesehen.', who: 'MA', at: '2027-01-04' }] },
      { id: 'm11', aircraftId: ASG, title: 'Bordnetz: Spannungsabfall', source: 'vf', photos: [], reportedAt: '2026-04-29', reportedBy: 'LE', priority: 'Normal', owner: 'HE', status: 'done', doneAt: '2026-05-16', doneBy: 'HE',
        desc: 'Das Bordnetz bricht zusammen, wenn die Mückenputzer bedient werden.',
        history: [{ text: 'Prüfbericht liegt unter Dokumente. Mückenputzer nur mit Batterie 2 verwenden.', who: 'HE', at: '2026-05-16' }] },
    ],

    deadlines: [
      { id: 'f1', aircraftId: ASG, title: 'TÜV', device: 'Transportanhänger', deviceInfo: 'Kennzeichen FB-OM 320', contact: 'Segelflugreferent', due: '2027-01-31' },
      { id: 'f2', aircraftId: ASG, title: 'Lufttüchtigkeitsprüfung', device: 'Luftfahrzeug', deviceInfo: 'Werknummer 32031', contact: 'Segelflugreferent', delegate: 'Matthias Greiner', due: '2027-03-06' },
      { id: 'f3', aircraftId: ASG, title: 'Ablauf Gurte', device: 'Luftfahrzeug', deviceInfo: 'Werknummer 32031', contact: 'Segelflugreferent', due: '2028-10-24' },
      { id: 'f4', aircraftId: ASG, title: 'Ablauf Kupplungen', device: 'Luftfahrzeug', deviceInfo: 'Werknummer 32031', contact: 'Segelflugreferent', delegate: 'Matthias Greiner', startsLeft: 1199 },
    ],

    documents: [
      { id: 'd1', aircraftId: ASG, title: 'Flughandbuch', kind: 'Handbuch', version: 'Ausgabe 01.12.2015', image: 'docs/flughandbuch.png', addedAt: '2026-10-03', addedBy: 'LO' },
      { id: 'd2', aircraftId: ASG, title: 'Wartungshandbuch', kind: 'Handbuch', version: 'Änderung TM 14 vom 11.04.2023', image: 'docs/wartungshandbuch.png', addedAt: '2026-10-03', addedBy: 'LO' },
      { id: 'd3', aircraftId: ASG, title: 'Aufbauanleitung', kind: 'Anleitung', version: 'Version 1.0 (2016)', image: 'docs/aufbauanleitung.webp', addedAt: '2026-10-03', addedBy: 'LO' },
      { id: 'd4', aircraftId: ASG, title: 'Gewichtsübersicht', kind: 'Prüfbericht', version: 'Wägung vom 04.03.2023', image: 'docs/gewichtsuebersicht.webp', addedAt: '2026-10-03', addedBy: 'LO' },
      // Applies to the whole club
      { id: 'd5', title: 'Werkstattordnung', kind: 'Sonstiges', version: 'Stand Oktober 2026', addedAt: '2026-10-10', addedBy: 'MA' },
    ],

    inventory: [
      { id: 'v1', kind: 'vs', name: 'Waschbenzin', location: 'Gefahrstoffschrank, unten links', mode: 'count', qty: 0, unit: ['l', 'l'], history: [{ text: 'Gezählt: 0 l', who: 'HE', at: '2027-01-16' }] },
      { id: 'v2', kind: 'vs', name: 'Mehrzweckfett', location: 'Werkbank links, Schublade 2', mode: 'flag', qty: 0, unit: ['', ''], history: [{ text: 'Gezählt: leer', who: 'MA', at: '2027-01-16' }] },
      { id: 'v3', kind: 'vs', name: 'Mikrofasertücher', location: 'Regal A, Fach 1', mode: 'flag', qty: 0, unit: ['', ''], history: [{ text: 'Gezählt: leer', who: 'MA', at: '2027-01-16' }] },
      { id: 'v4', kind: 'vs', name: 'Politur', location: 'Regal A, Fach 2', mode: 'count', qty: 2, unit: ['Dose', 'Dosen'], history: [] },
      { id: 'v5', kind: 'vs', name: 'Aceton', location: 'Gefahrstoffschrank, oben', mode: 'count', qty: 4, unit: ['Flasche', 'Flaschen'], history: [] },
      { id: 'v6', kind: 'vs', name: 'Lack', location: 'Gefahrstoffschrank, Mitte', mode: 'flag', qty: 1, unit: ['', ''], history: [{ text: 'Gezählt: fast leer', who: 'MA', at: '2027-01-16' }] },
      { id: 'v7', kind: 'vs', name: 'Härter', location: 'Gefahrstoffschrank, Mitte neben dem Lack', mode: 'flag', qty: 2, unit: ['', ''], history: [] },
      { id: 'v8', kind: 'vs', name: 'Politurfinish', location: 'Regal A, Fach 2', mode: 'flag', qty: 2, unit: ['', ''], history: [] },
      { id: 'v9', kind: 'vs', name: 'Polieraufsätze', location: 'Werkbank rechts, Schublade 1', mode: 'count', qty: 4, unit: ['Stk.', 'Stk.'], history: [] },
      { id: 'e1', kind: 'et', name: 'Reifenschlauch 4.00-4', location: 'Ersatzteilschrank, Fach 3', mode: 'count', qty: 0, unit: ['Stk.', 'Stk.'], fits: 'ASK21, ASK23, LS8', history: [{ text: 'Gezählt: 0 Stk.', who: 'LO', at: '2027-01-16' }] },
      { id: 'e2', kind: 'et', name: 'Bremsbeläge', location: 'Ersatzteilschrank, Fach 5', mode: 'count', qty: 0, unit: ['Satz', 'Satz'], fits: 'ASG32', history: [{ text: 'Gezählt: 0 Satz', who: 'HE', at: '2027-01-09' }] },
      { id: 'e3', kind: 'et', name: 'Dichtungssatz Wasserballast', location: 'Ersatzteilschrank, Fach 5', mode: 'count', qty: 0, unit: ['Satz', 'Satz'], fits: 'ASG32', history: [{ text: 'Gezählt: 0 Satz', who: 'HE', at: '2027-01-09' }] },
      { id: 'e4', kind: 'et', name: 'Ölfilter', location: 'Motorschrank', mode: 'count', qty: 2, unit: ['Stk.', 'Stk.'], fits: 'Arcus-T', history: [] },
      { id: 'e5', kind: 'et', name: 'Batterie 12 V', location: 'Ladeecke', mode: 'count', qty: 3, unit: ['Stk.', 'Stk.'], fits: 'alle Flugzeuge', history: [] },
      { id: 'e6', kind: 'et', name: 'Spornrad', location: 'Ersatzteilschrank, Fach 1', mode: 'count', qty: 1, unit: ['Stk.', 'Stk.'], fits: 'ASK21, ASK23', history: [] },
      { id: 'e7', kind: 'et', name: 'Kugelgelenk', location: 'Kleinteilekasten B', mode: 'count', qty: 2, unit: ['Stk.', 'Stk.'], fits: 'LS8', history: [] },
      { id: 'e8', kind: 'et', name: 'Bremsseil Radbremse', location: 'Ersatzteilschrank, Fach 2', mode: 'count', qty: 1, unit: ['Stk.', 'Stk.'], fits: 'Discus-2b, LS8', history: [] },
      { id: 'e9', kind: 'et', name: 'Zündkerzen', location: 'Motorschrank', mode: 'count', qty: 4, unit: ['Stk.', 'Stk.'], fits: 'Arcus-T', history: [] },
    ],

    orders: [
      { id: 'o1', itemId: 'v1', name: 'Waschbenzin', forWhat: 'Lager', state: 'list', reportedBy: 'HE', reportedAt: '2027-01-16', comment: '2 Kanister à 5 l. Nur im Gefahrstoffschrank lagern.', history: [{ text: 'Auf Bestellliste gesetzt', who: 'HE', at: '2027-01-16' }] },
      { id: 'o2', name: 'Schleifpapier P800', forWhat: 'Lager', state: 'list', reportedBy: TABLET, reportedAt: '2027-01-16', comment: '50 Bogen, nass. Gerne gleich P1000 mitbestellen.', history: [{ text: 'Auf Bestellliste gesetzt', who: TABLET, at: '2027-01-16' }] },
      { id: 'o3', itemId: 'e1', name: 'Reifenschlauch 4.00-4', forWhat: 'LS8', state: 'list', reportedBy: 'LO', reportedAt: '2027-01-16', comment: '1 Stück mit gewinkeltem Ventil.', history: [{ text: 'Auf Bestellliste gesetzt', who: 'LO', at: '2027-01-16' }] },
      { id: 'o4', itemId: 'e3', name: 'Dichtungssatz Wasserballast', forWhat: 'ASG32', state: 'ordered', reportedBy: 'HE', reportedAt: '2027-01-09', delivery: '2027-01-20', comment: '1 Satz, bestellt am 12.01. von Heinrich.', supplier: 'Hersteller (Ersatzteilservice)', articleNo: 'WB-32-DS', price: 48.9, orderedBy: 'HE', orderedAt: '2027-01-12', history: [{ text: 'Bestellt', who: 'HE', at: '2027-01-12' }, { text: 'Auf Bestellliste gesetzt', who: 'HE', at: '2027-01-09' }] },
      { id: 'o5', itemId: 'e2', name: 'Bremsbeläge', forWhat: 'ASG32', state: 'ordered', reportedBy: 'HE', reportedAt: '2027-01-09', delivery: '2027-01-22', comment: '1 Satz, bestellt am 13.01. von Heinrich.', supplier: 'Hersteller (Ersatzteilservice)', price: 86, orderedBy: 'HE', orderedAt: '2027-01-13', history: [{ text: 'Bestellt', who: 'HE', at: '2027-01-13' }, { text: 'Auf Bestellliste gesetzt', who: 'HE', at: '2027-01-09' }] },
      // Already delivered (order history)
      { id: 'o6', itemId: 'v4', name: 'Politur', forWhat: 'Lager', state: 'delivered', reportedBy: 'LE', reportedAt: '2026-11-07', comment: '', supplier: 'Flugsportbedarf', articleNo: 'POL-500', price: 39.8, orderedBy: 'MA', orderedAt: '2026-11-09', delivery: '2026-11-14', deliveredAt: '2026-11-14', deliveredQty: 2,
        history: [{ text: 'Geliefert', who: 'MA', at: '2026-11-14' }, { text: 'Bestellt · Lieferung ca. 14.11.', who: 'MA', at: '2026-11-09' }, { text: 'Auf Bestellliste gesetzt', who: 'LE', at: '2026-11-07' }] },
      { id: 'o7', itemId: 'e5', name: 'Batterie 12 V', forWhat: 'alle Flugzeuge', state: 'delivered', reportedBy: 'HE', reportedAt: '2026-11-21', comment: '7,2 Ah', supplier: 'Akku-Versand', price: 74.5, orderedBy: 'HE', orderedAt: '2026-11-22', delivery: '2026-11-28', deliveredAt: '2026-11-27', deliveredQty: 2,
        history: [{ text: 'Geliefert', who: 'HE', at: '2026-11-27' }, { text: 'Bestellt · Lieferung ca. 28.11.', who: 'HE', at: '2026-11-22' }, { text: 'Auf Bestellliste gesetzt', who: 'HE', at: '2026-11-21' }] },
      { id: 'o8', itemId: 'v3', name: 'Mikrofasertücher', forWhat: 'Lager', state: 'delivered', reportedBy: 'JO', reportedAt: '2026-12-05', comment: '', supplier: 'Baumarkt', price: 12.99, orderedBy: 'LO', orderedAt: '2026-12-07', delivery: '2026-12-12', deliveredAt: '2026-12-11',
        history: [{ text: 'Geliefert', who: 'LO', at: '2026-12-11' }, { text: 'Bestellt · Lieferung ca. 12.12.', who: 'LO', at: '2026-12-07' }, { text: 'Auf Bestellliste gesetzt', who: 'JO', at: '2026-12-05' }] },
    ],
  }
}
