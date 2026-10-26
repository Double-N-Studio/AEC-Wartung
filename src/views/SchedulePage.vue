<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { setLeader, state } from '../store'
import type { Aircraft, PersonKey } from '../types'
import { LEADERS, PEOPLE } from '../mock/people'
import { addDays, daysBetween, fmtDay, fmtLong, MONTHS, parse, toIso, TODAY } from '../utils/date'
import AppIcon from '../components/AppIcon.vue'
import AppModal from '../components/AppModal.vue'
import PersonAvatar from '../components/PersonAvatar.vue'

/* ---------- Saisonplan (Gantt) ---------- */
const SEASON_START = '2026-11-02'
const WEEKS = 21

function isoWeek(iso: string) {
  const d = parse(iso)
  const thursday = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 3 - ((d.getDay() + 6) % 7))
  const firstThursday = new Date(thursday.getFullYear(), 0, 4)
  return 1 + Math.round(((thursday.getTime() - firstThursday.getTime()) / 86400000 - 3 + ((firstThursday.getDay() + 6) % 7)) / 7)
}

const weeks = computed(() => Array.from({ length: WEEKS }, (_, i) => {
  const start = addDays(SEASON_START, i * 7)
  return { start, kw: isoWeek(start), month: parse(addDays(start, 3)).getMonth(), isNow: daysBetween(start, TODAY) >= 0 && daysBetween(start, TODAY) < 7 }
}))

const months = computed(() => {
  const out: { label: string; from: number; to: number }[] = []
  weeks.value.forEach((w, i) => {
    const last = out[out.length - 1]
    if (last && last.label === MONTHS[w.month]) last.to = i + 2
    else out.push({ label: MONTHS[w.month], from: i + 1, to: i + 2 })
  })
  return out
})

const weekIndex = (iso: string) => Math.max(0, Math.min(WEEKS - 1, Math.floor(daysBetween(SEASON_START, iso) / 7)))
const todayPct = (daysBetween(SEASON_START, TODAY) / (WEEKS * 7)) * 100

const workDays = (a: Aircraft) => {
  let n = 0
  for (let d = a.start; d <= a.end; d = addDays(d, 1)) {
    if (parse(d).getDay() === 6 && !state.schedule[d]?.closed) n += 1
  }
  return n
}

const bars = computed(() => [...state.aircraft]
  .sort((a, b) => a.start.localeCompare(b.start))
  .map((a) => {
    const status = a.end < TODAY ? 'done' : a.start <= TODAY ? 'running' : 'planned'
    const tasks = state.tasks.filter((t) => t.aircraftId === a.id)
    const doneCount = tasks.filter((t) => t.status === 'erledigt').length
    const info = status === 'done' ? 'fertig' : tasks.length ? `${doneCount} von ${tasks.length} erledigt` : status === 'planned' ? 'geplant' : 'läuft'
    return { a, status, col: `${weekIndex(a.start) + 1} / ${weekIndex(a.end) + 2}`, info: `${workDays(a)} Werkstatttage · ${info}` }
  }))

// Auf schmalen Bildschirmen den Plan so scrollen, dass "Heute" sichtbar ist.
const ganttScroll = ref<HTMLElement | null>(null)
onMounted(() => {
  const el = ganttScroll.value
  if (el && el.scrollWidth > el.clientWidth) el.scrollLeft = (el.scrollWidth * todayPct) / 100 - el.clientWidth / 2
})

// Das Popup hängt am <body>, damit es nicht im scrollbaren Plan abgeschnitten wird.
const pop = ref<{ id: string; top: number; left: number } | null>(null)
const popBar = computed(() => bars.value.find((b) => b.a.id === pop.value?.id) ?? null)
function toggleBar(id: string, e: MouseEvent) {
  if (pop.value?.id === id) { pop.value = null; return }
  const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
  pop.value = { id, top: r.bottom + 6, left: Math.max(8, Math.min(r.left, window.innerWidth - 256)) }
}
const closePop = (e: Event) => {
  const t = e.target as HTMLElement | null
  if (e.type === 'click' && t?.closest('.g-pop, .g-bar')) return
  pop.value = null
}
onMounted(() => {
  document.addEventListener('click', closePop)
  window.addEventListener('scroll', closePop, true)
  window.addEventListener('resize', closePop)
})
onBeforeUnmount(() => {
  document.removeEventListener('click', closePop)
  window.removeEventListener('scroll', closePop, true)
  window.removeEventListener('resize', closePop)
})
const rangeText = (a: Aircraft) => `Sa ${fmtDay(a.start)}${a.start.slice(0, 4) !== a.end.slice(0, 4) ? a.start.slice(0, 4) : ''} – Sa ${fmtDay(a.end)}${a.end.slice(0, 4)}`

/* ---------- Werkstattleitung (Kalender) ---------- */
const CAL_MONTHS = [{ y: 2026, m: 11 }, { y: 2027, m: 0 }, { y: 2027, m: 1 }, { y: 2027, m: 2 }]
const monthIdx = ref(1)
const calMonth = computed(() => CAL_MONTHS[monthIdx.value])
const monthLabel = computed(() => `${MONTHS[calMonth.value.m]} ${calMonth.value.y}`)

interface Cell { iso: string; day: number; inMonth: boolean; isSat: boolean }
const cells = computed<Cell[]>(() => {
  const { y, m } = calMonth.value
  const lead = (new Date(y, m, 1).getDay() + 6) % 7
  const dim = new Date(y, m + 1, 0).getDate()
  const total = Math.ceil((lead + dim) / 7) * 7
  return Array.from({ length: total }, (_, i) => {
    const d = new Date(y, m, 1 - lead + i)
    return { iso: toIso(d), day: d.getDate(), inMonth: d.getMonth() === m, isSat: d.getDay() === 6 }
  })
})
const saturdays = computed(() => cells.value.filter((c) => c.inMonth && c.isSat))

const dayInfo = (iso: string) => state.schedule[iso] ?? { leader: null, planes: '' }
const leaderOf = (iso: string) => dayInfo(iso).leader ?? null

const openDay = ref<string | null>(null)
const leaderModel = computed({
  get: () => (openDay.value ? leaderOf(openDay.value) ?? '' : ''),
  set: (v: string) => { if (openDay.value) setLeader(openDay.value, (v || null) as PersonKey | null) },
})
</script>

<template>
  <div class="page">
    <header>
      <h1 class="page-title">Zeitplan</h1>
      <p class="page-sub">Wintersaison 2026/27 · Werkstatt samstags 9–17 Uhr</p>
    </header>

    <section class="card gantt" aria-labelledby="gantt-h">
      <h2 id="gantt-h" class="section-title">Saisonplan</h2>
      <div ref="ganttScroll" class="gantt-scroll">
        <div class="gantt-inner">
          <div class="g-row g-months">
            <span v-for="mo in months" :key="mo.label" :style="{ gridColumn: `${mo.from} / ${mo.to}` }">{{ mo.label }}</span>
          </div>
          <div class="g-row g-weeks">
            <span v-for="(w, i) in weeks" :key="w.start" :class="{ now: w.isNow }">{{ i === 0 ? `KW ${w.kw}` : w.kw }}</span>
          </div>
          <div class="g-bars">
            <div v-for="b in bars" :key="b.a.id" class="g-row g-track">
              <div class="g-bar-wrap" :style="{ gridColumn: b.col }">
                <button type="button" class="g-bar" :class="b.status" :aria-expanded="pop?.id === b.a.id" @click="toggleBar(b.a.id, $event)">
                  <AppIcon v-if="b.status === 'done'" name="check" :size="12" :stroke="3" />
                  {{ b.a.type }} · {{ b.a.reg }}
                </button>
              </div>
            </div>
            <div class="g-today" :style="{ left: `${todayPct}%` }" />
            <span class="g-today-label" :style="{ left: `${todayPct}%` }">Heute · {{ fmtDay(TODAY) }}</span>
          </div>
        </div>
      </div>
    </section>

    <section class="card cal" aria-labelledby="cal-h">
      <div class="cal-head">
        <h2 id="cal-h" class="section-title">Werkstattleitung</h2>
        <div class="cal-nav">
          <button type="button" class="icon-btn small-btn" aria-label="Vorheriger Monat" :disabled="monthIdx === 0" @click="monthIdx--"><AppIcon name="chevronLeft" :size="16" /></button>
          <span class="cal-month">{{ monthLabel }}</span>
          <button type="button" class="icon-btn small-btn" aria-label="Nächster Monat" :disabled="monthIdx === CAL_MONTHS.length - 1" @click="monthIdx++"><AppIcon name="chevronRight" :size="16" /></button>
        </div>
      </div>

      <div class="cal-grid">
        <span v-for="d in ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']" :key="d" class="wd" :class="{ sat: d === 'Sa' }">{{ d }}</span>
        <template v-for="c in cells" :key="c.iso">
          <div v-if="!c.inMonth" class="cell out">{{ c.day }}</div>
          <div v-else-if="!c.isSat" class="cell plain">{{ c.day }}</div>
          <button v-else type="button" class="cell sat-cell" :class="{ closed: dayInfo(c.iso).closed, today: c.iso === TODAY }" @click="openDay = c.iso">
            <span class="cell-top"><span class="cell-day">{{ c.day }}</span><span v-if="c.iso === TODAY" class="today-pill">Heute</span></span>
            <template v-if="dayInfo(c.iso).closed"><span class="cell-sub">{{ dayInfo(c.iso).reason }}</span></template>
            <template v-else>
              <span v-if="dayInfo(c.iso).planes" class="cell-planes">{{ dayInfo(c.iso).planes }}</span>
              <span class="cell-sub">{{ leaderOf(c.iso) ? PEOPLE[leaderOf(c.iso)!].name : 'Leitung offen' }}</span>
            </template>
          </button>
        </template>
      </div>

      <ul class="cal-list">
        <li v-for="c in saturdays" :key="c.iso">
          <button type="button" class="list-item" :class="{ today: c.iso === TODAY }" @click="openDay = c.iso">
            <span class="list-date"><strong>Sa {{ fmtDay(c.iso) }}</strong><span v-if="c.iso === TODAY" class="today-pill">Heute</span></span>
            <span v-if="dayInfo(c.iso).closed" class="muted">{{ dayInfo(c.iso).reason }} – geschlossen</span>
            <template v-else>
              <span v-if="dayInfo(c.iso).planes" class="list-planes">{{ dayInfo(c.iso).planes }}</span>
              <span class="muted">{{ leaderOf(c.iso) ? PEOPLE[leaderOf(c.iso)!].name : 'Leitung offen' }}</span>
            </template>
          </button>
        </li>
      </ul>
    </section>

    <Teleport to="body">
      <div v-if="pop && popBar" class="g-pop" role="dialog" :aria-label="`${popBar.a.type} Zeitraum`" :style="{ top: `${pop.top}px`, left: `${pop.left}px` }">
        <strong>{{ popBar.a.type }} · {{ popBar.a.reg }}</strong>
        <span>{{ rangeText(popBar.a) }}</span>
        <span class="muted small">{{ popBar.info }}</span>
        <RouterLink :to="`/flugzeug/${popBar.a.id}`" class="small strong">Zum Flugzeug →</RouterLink>
      </div>
    </Teleport>

    <AppModal v-if="openDay" :title="fmtLong(openDay)" kicker="Werkstatttag · 9–17 Uhr" :width="500" @close="openDay = null">
      <div v-if="dayInfo(openDay).closed" class="closed-box">Werkstatt geschlossen · {{ dayInfo(openDay).reason }}</div>
      <div v-else class="day-body">
        <div class="field">
          <span class="field-label">Werkstattleitung</span>
          <div v-if="leaderOf(openDay)" class="leader-row"><PersonAvatar :person="leaderOf(openDay)!" :size="40" /><strong>{{ PEOPLE[leaderOf(openDay)!].name }}</strong></div>
          <div v-else class="empty-box">Noch niemand eingetragen</div>
        </div>
        <div class="field">
          <label for="day-leader">Werkstattleitung festlegen</label>
          <select id="day-leader" v-model="leaderModel" class="select">
            <option value="">Noch offen</option>
            <option v-for="k in LEADERS" :key="k" :value="k">{{ PEOPLE[k].name }}</option>
          </select>
        </div>
        <div class="field">
          <span class="field-label">Flugzeuge an diesem Tag</span>
          <span>{{ dayInfo(openDay).planes || '–' }}</span>
        </div>
      </div>
      <template #footer>
        <button type="button" class="btn btn-primary" @click="openDay = null">Fertig</button>
      </template>
    </AppModal>
  </div>
</template>

<style scoped>
.small { font-size: 12.5px; }
.strong { font-weight: 600; text-decoration: none; }

/* Gantt */
.gantt { padding: 18px 20px; display: flex; flex-direction: column; gap: 12px; }
.gantt-scroll { overflow-x: auto; padding-bottom: 4px; }
.gantt-inner { min-width: 820px; display: flex; flex-direction: column; gap: 4px; }
.g-row { display: grid; grid-template-columns: repeat(21, minmax(0, 1fr)); }
.g-months span { font-size: 12px; font-weight: 600; color: var(--text-2); border-left: 1px solid #D5DCE5; padding-left: 6px; height: 18px; }
.g-weeks span { font-size: 11px; color: var(--muted); text-align: center; height: 18px; }
.g-weeks .now { color: var(--today); font-weight: 700; }
.g-bars { position: relative; display: flex; flex-direction: column; gap: 4px; margin-top: 4px; }
.g-track { height: 30px; background-image: linear-gradient(to right, var(--border-soft) 1px, transparent 1px); background-size: calc(100% / 21) 100%; }
.g-bar-wrap { position: relative; align-self: center; margin: 0 2px; }
.g-bar {
  width: 100%; height: 26px; border-radius: 7px; padding: 0 10px; border: 1px solid transparent;
  display: flex; align-items: center; gap: 6px; font-size: 12.5px; font-weight: 600; white-space: nowrap; overflow: hidden;
}
.g-bar.done { background: var(--green-soft); border-color: #B5DCC6; color: var(--green-ink); }
.g-bar.running { background: var(--accent); color: #fff; }
.g-bar.planned { background: var(--surface); border: 1.5px dashed var(--faint); color: var(--text-2); }
.g-pop {
  position: fixed; z-index: 40; width: 240px; padding: 14px;
  background: var(--surface); border: 1px solid #D5DCE5; border-radius: 12px; box-shadow: var(--shadow-pop);
  display: flex; flex-direction: column; gap: 4px; font-size: 13px;
}
.g-today { position: absolute; top: 0; bottom: 0; width: 2px; background: var(--today); pointer-events: none; }
.g-today-label {
  position: absolute; top: 6px; transform: translateX(-50%); pointer-events: none; white-space: nowrap;
  background: var(--today); color: #fff; font-size: 11px; font-weight: 700; padding: 2px 7px; border-radius: 999px;
}

/* Kalender */
.cal { padding: 18px 20px; display: flex; flex-direction: column; gap: 12px; }
.cal-head { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.cal-nav { display: flex; align-items: center; gap: 4px; }
.small-btn { width: 36px; height: 36px; border-color: #D5DCE5; color: var(--text-2); }
.cal-month { min-width: 132px; text-align: center; font-size: 15px; font-weight: 600; }
.cal-grid { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 5px; }
.wd { font-size: 12px; font-weight: 600; color: var(--muted); padding: 0 2px; }
.wd.sat { color: var(--text); }
.cell {
  min-height: 62px; border-radius: 10px; padding: 5px 9px; font-size: 13px; text-align: left;
  display: flex; flex-direction: column; gap: 4px; overflow: hidden;
}
.cell.out { color: var(--muted); }
.cell.plain { background: var(--subtle); border: 1px solid var(--border-soft); font-weight: 600; color: var(--text-2); }
.sat-cell { background: var(--surface); border: 1px solid #B9C3CF; color: var(--text); }
.sat-cell.closed { background: var(--subtle); border-color: var(--border-soft); }
.sat-cell.today { background: var(--accent-tint); border: 2px solid var(--accent); padding: 4px 8px; }
.sat-cell { gap: 2px; }
.cell-top { display: flex; align-items: center; justify-content: space-between; }
.cell-day { font-weight: 700; }
.today .cell-day { color: var(--accent-ink); }
.today-pill { font-size: 10.5px; font-weight: 700; color: #fff; background: var(--accent); border-radius: 999px; padding: 1px 7px; }
.cell-planes { font-size: 12.5px; font-weight: 600; line-height: 1.3; overflow: hidden; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
.cell-sub { font-size: 11px; color: var(--muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }
.list-planes { font-weight: 600; }
.cal-list { display: none; list-style: none; margin: 0; padding: 0; flex-direction: column; gap: 8px; }
.list-item {
  width: 100%; min-height: 56px; display: flex; flex-direction: column; align-items: flex-start; gap: 4px;
  padding: 10px 12px; border-radius: 10px; border: 1px solid var(--border); background: var(--surface); text-align: left; font-size: 13.5px;
}
.list-item.today { border: 2px solid var(--accent); background: var(--accent-tint); }
.list-date { display: flex; align-items: center; gap: 8px; }

.day-body { display: flex; flex-direction: column; gap: 16px; }
.leader-row { display: flex; align-items: center; gap: 12px; font-size: 16px; }
.empty-box { padding: 12px 14px; border-radius: 10px; background: var(--subtle); color: var(--text-2); font-size: 14px; }
.closed-box { padding: 14px 16px; border-radius: 12px; background: var(--bg); font-size: 14px; font-weight: 600; color: var(--text-2); }

@media (max-width: 640px) {
  .cal-grid { display: none; }
  .cal-list { display: flex; }
  .gantt, .cal { padding: 14px; }
}
</style>
