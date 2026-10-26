<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { fitsAircraft, state } from '../../store'

const route = useRoute()
const aircraft = computed(() => state.aircraft.find((a) => a.id === route.params.id && a.hasDetails))
const base = computed(() => `/flugzeug/${route.params.id}`)

const tasks = computed(() => state.tasks.filter((t) => t.aircraftId === aircraft.value?.id))

const tabs = computed(() => {
  const id = aircraft.value?.id
  return [
    { to: 'arbeitspakete', label: 'Arbeitspakete', count: tasks.value.length },
    { to: 'dokumente', label: 'Dokumente', count: state.documents.filter((d) => d.aircraftId === id).length },
    { to: 'fristen', label: 'Fristen', count: state.deadlines.filter((d) => d.aircraftId === id).length },
    { to: 'maengel', label: 'Mängel/Befunde', count: state.defects.filter((d) => d.aircraftId === id && d.status === 'open').length, warn: true },
    { to: 'material', label: 'Material', count: state.inventory.filter((i) => fitsAircraft(i, aircraft.value?.type ?? '')).length },
  ]
})
</script>

<template>
  <div v-if="aircraft" class="page aircraft">
    <header class="titles">
      <div class="name"><h1 class="page-title">{{ aircraft.type }}</h1><span class="reg">{{ aircraft.reg }}</span></div>
      <span class="muted meta">Flugzeugpate: {{ aircraft.sponsor }}</span>
    </header>

    <nav class="tabs" aria-label="Bereiche des Flugzeugs">
      <RouterLink v-for="t in tabs" :key="t.to" :to="`${base}/${t.to}`" class="tab" active-class="active">
        {{ t.label }}<span class="tab-count" :class="{ warn: t.warn }">{{ t.count }}</span>
      </RouterLink>
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
.titles { display: flex; flex-direction: column; gap: 6px; }
.name { display: flex; align-items: baseline; gap: 12px; }
.reg { font-size: 20px; color: var(--muted); font-weight: 500; }
.meta { font-size: 13px; }
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
</style>
