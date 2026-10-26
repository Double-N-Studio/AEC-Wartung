<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { state } from '../../store'
import { fmtDate, fmtDay } from '../../utils/date'

const route = useRoute()
const aircraft = computed(() => state.aircraft.find((a) => a.id === route.params.id && a.hasDetails))
const base = computed(() => `/flugzeug/${route.params.id}`)

const tasks = computed(() => state.tasks.filter((t) => t.aircraftId === aircraft.value?.id))
const doneCount = computed(() => tasks.value.filter((t) => t.status === 'erledigt').length)
const pct = computed(() => (tasks.value.length ? Math.round((doneCount.value / tasks.value.length) * 100) : 0))

const tabs = computed(() => {
  const id = aircraft.value?.id
  return [
    { to: 'arbeitspakete', label: 'Arbeitspakete', count: tasks.value.length },
    { to: 'dokumente', label: 'Dokumente', count: state.documents.filter((d) => d.aircraftId === id).length },
    { to: 'fristen', label: 'Fristen', count: state.deadlines.filter((d) => d.aircraftId === id).length },
    { to: 'maengel', label: 'Mängel/Befunde', count: state.defects.filter((d) => d.aircraftId === id && d.status === 'open').length, warn: true },
  ]
})
</script>

<template>
  <div v-if="aircraft" class="page aircraft">
    <div class="head">
      <nav aria-label="Brotkrumen" class="crumbs">
        <RouterLink to="/">Zeitplan</RouterLink><span aria-hidden="true">›</span>
        <span>Flugzeuge</span><span aria-hidden="true">›</span>
        <span class="current">{{ aircraft.type }}</span>
      </nav>
      <header class="title-row">
        <div class="titles">
          <div class="name"><h1 class="page-title">{{ aircraft.type }}</h1><span class="reg">{{ aircraft.reg }}</span></div>
          <span class="muted meta">Werkstattzeit {{ fmtDay(aircraft.start) }}–{{ fmtDate(aircraft.end) }} · Flugzeugpate: {{ aircraft.sponsor }}</span>
        </div>
        <div class="progress">
          <div class="progress-text"><span class="muted">{{ doneCount }} von {{ tasks.length }} erledigt</span><strong>{{ pct }} %</strong></div>
          <div class="bar"><div :style="{ width: `${pct}%` }" /></div>
        </div>
      </header>
    </div>

    <nav class="tabs" aria-label="Bereiche des Flugzeugs">
      <RouterLink v-for="t in tabs" :key="t.to" :to="`${base}/${t.to}`" class="tab" active-class="active">
        {{ t.label }}<span class="tab-count" :class="{ warn: t.warn }">{{ t.count }}</span>
      </RouterLink>
      <span class="tab disabled" title="Im Mockup noch ohne Inhalt">Material</span>
    </nav>

    <RouterView />
  </div>
  <div v-else class="page">
    <h1 class="page-title">Flugzeug nicht gefunden</h1>
    <RouterLink to="/">Zurück zum Zeitplan</RouterLink>
  </div>
</template>

<style scoped>
.aircraft { gap: 16px; }
.head { display: flex; flex-direction: column; gap: 10px; }
.crumbs { display: flex; align-items: center; gap: 6px; font-size: 13px; color: var(--muted); }
.crumbs a { color: var(--muted); text-decoration: none; }
.crumbs .current { color: var(--text); font-weight: 600; }
.title-row { display: flex; align-items: center; justify-content: space-between; gap: 20px; flex-wrap: wrap; }
.titles { display: flex; flex-direction: column; gap: 6px; }
.name { display: flex; align-items: baseline; gap: 12px; }
.reg { font-size: 20px; color: var(--muted); font-weight: 500; }
.meta { font-size: 13px; }
.progress { display: flex; flex-direction: column; gap: 6px; width: 240px; }
.progress-text { display: flex; justify-content: space-between; font-size: 13px; }
.bar { height: 8px; border-radius: 4px; background: var(--border); overflow: hidden; }
.bar div { height: 100%; background: var(--accent); border-radius: 4px; transition: width 0.3s; }
.tabs { display: flex; gap: 4px; border-bottom: 1px solid var(--border); overflow-x: auto; flex-shrink: 0; }
.tab {
  display: inline-flex; align-items: center; gap: 8px; padding: 12px 14px; white-space: nowrap;
  font-size: 14px; font-weight: 500; color: var(--text-2); text-decoration: none; border-bottom: 2px solid transparent; margin-bottom: -1px;
}
.tab.active { font-weight: 600; color: var(--accent-ink); border-bottom-color: var(--accent); }
.tab.disabled { cursor: default; color: var(--faint); }
.tab-count { font-size: 12px; color: var(--muted); background: #E9EDF2; border-radius: 999px; padding: 1px 7px; }
.tab.active .tab-count { background: var(--accent-soft); color: var(--accent-ink); }
.tab-count.warn { background: var(--orange-soft); color: var(--orange-ink); }
@media (max-width: 640px) {
  .progress { width: 100%; }
}
</style>
