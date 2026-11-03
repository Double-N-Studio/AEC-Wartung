<script setup lang="ts">
import { computed } from 'vue'
import { userName } from '../../store'
import type { ArchivedSeason } from '../../types'
import { fmtDate, fmtWhen } from '../../utils/date'
import AppIcon from '../../components/AppIcon.vue'
import AppModal from '../../components/AppModal.vue'

/** Abgeschlossene Saison zum Nachlesen: pro Flugzeug, welche Karten wer erledigt und wer abgezeichnet hat. */
const props = defineProps<{ season: ArchivedSeason }>()
const emit = defineEmits<{ close: [] }>()

const STATUS = { offen: 'Offen', arbeit: 'In Arbeit', erledigt: 'Erledigt' }

const planes = computed(() => props.season.aircraft
  .map((a) => {
    const tasks = props.season.tasks.filter((t) => t.aircraftId === a.id)
    return { ...a, tasks, done: tasks.filter((t) => t.status === 'erledigt').length, signed: tasks.filter((t) => t.signedBy).length }
  })
  .filter((a) => a.tasks.length))
</script>

<template>
  <AppModal
    :title="`Saison ${season.label}`" icon="calendar" :width="760" @close="emit('close')"
    :subtitle="`Sa ${fmtDate(season.start)} – Sa ${fmtDate(season.end)} · nur lesen`"
  >
    <details v-for="a in planes" :key="a.id" class="plane">
      <summary>
        <span class="name"><strong>{{ a.type }}</strong><span class="muted">{{ a.reg }}</span></span>
        <span class="muted progress">{{ a.done }} von {{ a.tasks.length }} erledigt · {{ a.signed }} abgezeichnet</span>
        <AppIcon name="chevronDown" :size="16" class="chev" />
      </summary>
      <ul class="tasks">
        <li v-for="t in a.tasks" :key="t.id">
          <span class="title">{{ t.title }}</span>
          <span v-if="t.status === 'erledigt'" class="muted meta">
            {{ userName(t.doneBy) }} · {{ fmtWhen(t.doneAt!) }}
            <template v-if="t.signedBy"> · <AppIcon name="shield" :size="13" /> {{ userName(t.signedBy) }}</template>
          </span>
          <span v-else class="pill pill-gray">{{ STATUS[t.status] }}</span>
        </li>
      </ul>
    </details>
    <p v-if="!planes.length" class="muted">In dieser Saison gab es keine Kanban-Karten.</p>
    <template #meta>Archiviert am {{ fmtDate(season.closedAt) }} von {{ userName(season.closedBy) }}</template>
    <template #footer>
      <button type="button" class="btn" @click="emit('close')">Schließen</button>
    </template>
  </AppModal>
</template>

<style scoped>
.plane { border: 1px solid var(--border); border-radius: 12px; }
.plane summary { list-style: none; display: flex; align-items: center; gap: 12px; padding: 12px 14px; cursor: pointer; }
.plane summary::-webkit-details-marker { display: none; }
.name { flex: 1; min-width: 0; display: flex; align-items: baseline; gap: 8px; font-size: 14.5px; }
.name .muted { font-size: 13px; }
.progress { font-size: 12.5px; }
.chev { color: var(--muted); flex-shrink: 0; transition: transform 0.15s; }
.plane[open] .chev { transform: rotate(180deg); }
.tasks { list-style: none; margin: 0; padding: 0 14px 10px; }
.tasks li { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 8px 0; border-top: 1px solid var(--border-soft); font-size: 13.5px; }
.title { min-width: 0; }
.meta { display: inline-flex; align-items: center; gap: 4px; font-size: 12.5px; white-space: nowrap; }
@media (max-width: 640px) {
  .plane summary { flex-wrap: wrap; row-gap: 2px; }
  .progress { order: 3; width: 100%; }
  .tasks li { flex-direction: column; align-items: flex-start; gap: 2px; }
  .meta { white-space: normal; }
}
</style>
