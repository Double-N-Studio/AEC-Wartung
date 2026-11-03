<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { docsFor, fitsAircraft, state, userName } from '../../store'

const route = useRoute()
const aircraft = computed(() => state.aircraft.find((a) => a.id === route.params.id))
const base = computed(() => `/flugzeug/${route.params.id}`)

const tasks = computed(() => state.tasks.filter((t) => t.aircraftId === aircraft.value?.id))

const tabs = computed(() => {
  const id = aircraft.value?.id
  return [
    { to: 'kanban', label: 'Kanban', count: tasks.value.length },
    { to: 'dokumente', label: 'Dokumente', count: id ? docsFor(id).length : 0 },
    { to: 'fristen', label: 'Fristen', count: state.deadlines.filter((d) => d.aircraftId === id).length },
    { to: 'maengel', label: 'Mängel/Befunde', count: state.defects.filter((d) => d.aircraftId === id && d.status === 'open').length },
    { to: 'material', label: 'Material', count: state.inventory.filter((i) => fitsAircraft(i, aircraft.value?.type ?? '')).length },
  ]
})
</script>

<template>
  <div v-if="aircraft" class="page aircraft">
    <header class="titles">
      <div class="name"><h1 class="page-title">{{ aircraft.type }}</h1><span class="reg">{{ aircraft.reg }}</span><span v-if="aircraft.retired" class="pill pill-gray">Ausgemustert</span></div>
      <span v-if="aircraft.manager" class="muted meta">Flugzeugpate: {{ userName(aircraft.manager) }}</span>
    </header>

    <nav class="tabs" aria-label="Bereiche des Flugzeugs">
      <RouterLink v-for="t in tabs" :key="t.to" :to="`${base}/${t.to}`" class="tab" active-class="active">
        {{ t.label }}<span class="tab-count">{{ t.count }}</span>
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
</style>
