<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { can, state, userName } from '../../store'
import type { Level, Task, TaskStatus } from '../../types'
import { LEVEL_KEYS, LEVELS } from '../../utils/levels'
import { fmtDay, fmtWhen } from '../../utils/date'
import AppIcon from '../../components/AppIcon.vue'
import LevelBadge from '../../components/LevelBadge.vue'
import LevelBars from '../../components/LevelBars.vue'
import TaskModal from './TaskModal.vue'
import TaskFormModal from './TaskFormModal.vue'

const route = useRoute()
const aircraftId = computed(() => String(route.params.id))

const level = ref<Level | 'alle'>('alle')
const filtered = computed(() => state.tasks.filter((t) => t.aircraftId === aircraftId.value && (level.value === 'alle' || t.level === level.value)))
const column = (status: TaskStatus) => filtered.value.filter((t) => t.status === status)

const COLUMNS: { status: TaskStatus; title: string; dot: string }[] = [
  { status: 'offen', title: 'Offen', dot: 'var(--faint)' },
  { status: 'arbeit', title: 'In Arbeit', dot: 'var(--accent)' },
  { status: 'erledigt', title: 'Erledigt', dot: 'var(--green)' },
]

const chips = computed(() => [
  { value: 'alle' as const, label: 'Alle', fg: 'var(--text)', bars: 0 },
  ...LEVEL_KEYS.map((k) => ({ value: k, label: LEVELS[k].long, fg: LEVELS[k].fg, bars: LEVELS[k].bars })),
])

// Scroll-Hinweis: Verlauf am unteren Rand und "N weitere", solange eine Spalte unten noch Karten verbirgt.
const lists: Partial<Record<TaskStatus, HTMLElement>> = {}
const overflow = reactive<Record<TaskStatus, { fade: boolean; more: number }>>({
  offen: { fade: false, more: 0 }, arbeit: { fade: false, more: 0 }, erledigt: { fade: false, more: 0 },
})
const measure = (status: TaskStatus) => {
  const el = lists[status]
  if (!el) return
  const bottom = el.scrollTop + el.clientHeight
  overflow[status].fade = el.scrollHeight - bottom > 4
  // Karten, die zu mehr als der Hälfte unterhalb des sichtbaren Bereichs liegen.
  overflow[status].more = [...el.querySelectorAll<HTMLElement>('.task')].filter((c) => c.offsetTop + c.offsetHeight / 2 > bottom).length
}
const resizeObserver = new ResizeObserver((entries) => {
  for (const e of entries) measure((e.target as HTMLElement).dataset.status as TaskStatus)
})
const setList = (status: TaskStatus, el: HTMLElement | null) => {
  if (el === lists[status]) return
  if (lists[status]) resizeObserver.unobserve(lists[status]!)
  if (el) { lists[status] = el; resizeObserver.observe(el) } else delete lists[status]
}
watch(filtered, () => COLUMNS.forEach((c) => measure(c.status)), { flush: 'post' })
onBeforeUnmount(() => resizeObserver.disconnect())
const scrollMore = (status: TaskStatus) => {
  const el = lists[status]
  el?.scrollBy({ top: el.clientHeight * 0.8, behavior: 'smooth' })
}

const checked = (t: Task) => t.checklist.filter((c) => c.done).length
const defectOf = (t: Task) => (t.defectId ? state.defects.find((d) => d.id === t.defectId) : undefined)

// ?paket=<id> öffnet eine Kanban-Karte direkt (Link aus dem Mangel/Befund).
const router = useRouter()
const openId = ref<string | null>(null)
watch(() => route.query.paket, (id) => { if (typeof id === 'string') openId.value = id }, { immediate: true })
const closeTask = () => {
  openId.value = null
  if (route.query.paket) router.replace({ query: {} })
}
const openTask = computed(() => state.tasks.find((t) => t.id === openId.value) ?? null)
// Formular für neue ('new') oder bestehende Karte; die Detailansicht ist solange ausgeblendet.
const form = ref<Task | 'new' | null>(null)
</script>

<template>
  <div class="filters">
    <span class="muted label">Geeignet für</span>
    <button
      v-for="c in chips" :key="c.value" type="button" class="chip" :aria-pressed="level === c.value"
      :style="level === c.value ? {} : { color: c.fg }" @click="level = c.value"
    >
      <LevelBars v-if="c.bars" :bars="c.bars" />{{ c.label }}
    </button>
  </div>

  <div class="board">
    <section v-for="col in COLUMNS" :key="col.status" class="column" :aria-label="col.title">
      <div class="col-head">
        <span class="dot" :style="{ background: col.dot }" />
        <h2>{{ col.title }}</h2>
        <span class="count">{{ column(col.status).length }}</span>
        <button v-if="col.status === 'offen' && can('edit')" type="button" class="add" aria-label="Kanban-Karte anlegen" @click="form = 'new'">
          <AppIcon name="plus" :stroke="2.2" />
        </button>
      </div>
      <div class="col-scroll">
      <div :ref="(el) => setList(col.status, el as HTMLElement | null)" class="col-list" :data-status="col.status" @scroll.passive="measure(col.status)">
        <button v-for="t in column(col.status)" :key="t.id" type="button" class="task" @click="openId = t.id">
          <span class="task-top">
            <span class="task-title">{{ t.title }}</span>
            <LevelBadge v-if="t.status !== 'erledigt'" :level="t.level" class="task-tag" />
            <AppIcon v-else name="check" :size="18" :stroke="2.4" class="done-icon" />
          </span>
          <span v-if="t.desc" class="task-desc">{{ t.desc }}</span>
          <span v-if="defectOf(t)" class="task-origin">
            <AppIcon :name="defectOf(t)!.source === 'vf' ? 'cloud' : 'camera'" :size="14" :stroke="1.9" />
            <span class="task-origin-text"><b>{{ defectOf(t)!.source === 'vf' ? 'Mangel' : 'Befund' }}:</b> {{ defectOf(t)!.title }}</span>
          </span>
          <!-- Checklisten-Fortschritt erst ab "In Arbeit"; offene Karten zeigen die Dauer. -->
          <span v-if="t.status === 'offen' || (t.status === 'arbeit' && (t.checklist.length || t.deadline))" class="task-meta">
            <span v-if="t.status === 'offen'"><AppIcon name="clock" :size="14" />{{ t.duration }}</span>
            <span v-else-if="t.checklist.length"><AppIcon name="list" :size="14" />{{ checked(t) }}/{{ t.checklist.length }}</span>
            <span v-if="t.deadline" class="deadline"><AppIcon name="calendar" :size="14" />Frist {{ fmtDay(t.deadline) }}</span>
          </span>
          <span v-if="t.status === 'erledigt'" class="task-done">
            <span>Erledigt: <b>{{ userName(t.doneBy) }}</b> · {{ fmtWhen(t.doneAt!) }}</span>
            <span v-if="t.signedBy" class="signed"><AppIcon name="shield" :size="14" />Abgezeichnet: <b>{{ userName(t.signedBy) }}</b> · {{ fmtWhen(t.signedAt!) }}</span>
            <span v-else class="unsigned"><AppIcon name="clock" :size="14" />Abzeichnung offen</span>
          </span>
        </button>
        <p v-if="!column(col.status).length" class="empty">Keine Karten.</p>
      </div>
      <div v-if="overflow[col.status].fade" class="col-fade" />
      <button v-if="overflow[col.status].more" type="button" class="col-more" @click="scrollMore(col.status)">
        {{ overflow[col.status].more }} weitere<AppIcon name="chevronDown" :size="14" :stroke="2.2" />
      </button>
      </div>
    </section>
  </div>

  <TaskModal v-if="openTask && !form" :task="openTask" @close="closeTask" @edit="form = openTask" />
  <TaskFormModal v-if="form" :aircraft-id="aircraftId" :task="form === 'new' ? undefined : form" @close="form = null" />
</template>

<style scoped>
.filters { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.label { font-size: 13px; font-weight: 500; margin-right: 4px; }
.chip {
  height: 36px; padding: 0 14px; border-radius: 999px; border: 1px solid var(--border-strong); background: var(--surface);
  font-size: 13px; font-weight: 600; display: inline-flex; align-items: center; gap: 6px; white-space: nowrap;
}
.chip[aria-pressed='true'] { background: var(--text); border-color: var(--text); color: #fff; }

.board { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; align-items: start; }
.column { background: var(--column); border-radius: 14px; padding: 12px; display: flex; flex-direction: column; gap: 10px; }
.col-head { display: flex; align-items: center; gap: 8px; height: 36px; padding: 0 2px 0 4px; }
.col-head h2 { font-size: 15px; font-weight: 700; }
.dot { width: 10px; height: 10px; border-radius: 50%; }
.add {
  margin-left: auto; width: 36px; height: 36px; border-radius: 9px; border: 1px solid var(--border-strong);
  background: var(--surface); color: var(--accent-ink); display: inline-flex; align-items: center; justify-content: center;
}
.col-scroll { position: relative; }
.col-list { position: relative; display: flex; flex-direction: column; gap: 10px; max-height: calc(100vh - 340px); min-height: 120px; overflow-y: auto; padding-right: 2px; }
.col-fade {
  position: absolute; left: 0; right: 0; bottom: 0; height: 64px; pointer-events: none;
  background: linear-gradient(to bottom, transparent, var(--column));
}
.col-more {
  position: absolute; left: 50%; bottom: 10px; transform: translateX(-50%);
  height: 30px; padding: 0 10px 0 12px; border-radius: 999px; border: 1px solid var(--border-strong);
  background: var(--surface); box-shadow: var(--shadow-pop); color: var(--text-2);
  font-size: 12.5px; font-weight: 600; display: inline-flex; align-items: center; gap: 4px; white-space: nowrap;
}
.col-more:hover { color: var(--text); }
.task {
  width: 100%; text-align: left; background: var(--surface); border: 1px solid var(--border); border-radius: 12px;
  padding: 14px; display: flex; flex-direction: column; gap: 8px; flex-shrink: 0; min-height: 104px;
}
.task:hover { border-color: var(--border-strong); }
.task-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
.task-tag, .done-icon { flex-shrink: 0; }
.done-icon { color: var(--green); }
.task-title { font-size: 14.5px; font-weight: 600; line-height: 1.35; min-width: 0; }
.task-desc {
  font-size: 12.5px; line-height: 1.4; color: var(--text-2);
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
}
.task-origin {
  display: flex; align-items: center; gap: 6px; min-width: 0; padding: 5px 8px; border-radius: 8px;
  background: var(--accent-tint); border: 1px solid var(--accent-soft); font-size: 12px; color: var(--accent-ink);
}
.task-origin svg { flex-shrink: 0; }
.task-origin-text { min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.task-origin b { font-weight: 700; }
.task-meta { display: flex; flex-wrap: wrap; gap: 12px; font-size: 12.5px; color: var(--muted); }
.task-meta > span { display: inline-flex; align-items: center; gap: 5px; }
.deadline { color: var(--orange-ink); font-weight: 600; }
.task-done { display: flex; flex-direction: column; gap: 4px; font-size: 12.5px; color: var(--text-2); }
.task-done b { font-weight: 600; }
.signed, .unsigned { display: inline-flex; align-items: center; gap: 6px; }
.signed { color: var(--green-ink); }
.unsigned { color: var(--orange-ink); font-weight: 600; }
.empty { font-size: 13px; color: var(--muted); padding: 8px 4px; }

@media (max-width: 1100px) {
  .board { grid-template-columns: 1fr; }
  .col-list { max-height: none; }
}
</style>
