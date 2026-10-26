<script setup lang="ts">
import { computed } from 'vue'
import { aircraftLabel, finishTask, signTask, startTask, state } from '../../store'
import type { PersonKey, Task } from '../../types'
import { PEOPLE } from '../../mock/people'
import { fmtDay, fmtWhen } from '../../utils/date'
import AppIcon from '../../components/AppIcon.vue'
import AppModal from '../../components/AppModal.vue'
import HistoryList from '../../components/HistoryList.vue'
import LevelBadge from '../../components/LevelBadge.vue'

const props = defineProps<{ task: Task }>()
const emit = defineEmits<{ close: [] }>()

const STATUS = { offen: ['Offen', 'pill-gray'], arbeit: ['In Arbeit', 'pill-accent'], erledigt: ['Erledigt', 'pill-green'] }
const defect = computed(() => state.defects.find((d) => d.id === props.task.defectId))
const checked = computed(() => props.task.checklist.filter((c) => c.done).length)
const started = computed(() => props.task.history.find((h) => h.text === 'Arbeit gestartet'))
// Abzeichnen übernimmt die heutige Werkstattleitung.
const todaysLeader: PersonKey = 'MA'
</script>

<template>
  <AppModal :title="task.title" icon="wrench" :subtitle="`Arbeitspaket · ${aircraftLabel(task.aircraftId)}`" @close="emit('close')">
    <template #status>
      <span class="pill" :class="STATUS[task.status][1]">{{ STATUS[task.status][0] }}</span>
    </template>

    <div class="tiles">
      <div class="tile"><span>Geeignet für</span><LevelBadge :level="task.level" /></div>
      <div class="tile"><span>Dauer</span><strong>{{ task.duration }}</strong></div>
      <div v-if="task.checklist.length" class="tile"><span>Checkliste</span><strong>{{ checked }} von {{ task.checklist.length }}</strong></div>
      <div v-if="task.deadline" class="tile"><span>Frist</span><strong class="deadline">{{ fmtDay(task.deadline) }}</strong></div>
    </div>

    <p class="desc">{{ task.desc }}</p>

    <div v-if="task.doc || defect" class="links">
      <RouterLink v-if="task.doc" :to="`/flugzeug/${task.aircraftId}/dokumente`"><AppIcon name="file" :size="16" />{{ task.doc }}</RouterLink>
      <RouterLink v-if="defect" :to="`/flugzeug/${task.aircraftId}/maengel`"><AppIcon name="alert" :size="16" />{{ defect.title }}</RouterLink>
    </div>

    <div v-if="task.checklist.length" class="checklist" role="group" aria-label="Checkliste">
      <label v-for="(item, i) in task.checklist" :key="i" class="check" :class="{ done: item.done }">
        <input v-model="item.done" type="checkbox"><span>{{ item.text }}</span>
      </label>
    </div>

    <HistoryList :entries="task.history" />

    <template #meta>
      <span v-if="task.signedBy" class="signed"><AppIcon name="shield" :size="15" />Abgezeichnet von {{ task.signedBy }} · {{ fmtWhen(task.signedAt!) }}</span>
      <span v-else-if="task.status === 'erledigt'">Erledigt von {{ task.doneBy }} · {{ fmtWhen(task.doneAt!) }}</span>
      <span v-else-if="started">Gestartet von {{ started.who }} · {{ fmtWhen(started.at) }}</span>
    </template>
    <template #footer>
      <button v-if="task.status === 'offen'" type="button" class="btn btn-primary" @click="startTask(task)">Arbeit starten</button>
      <button v-else-if="task.status === 'arbeit'" type="button" class="btn btn-primary" @click="finishTask(task)">
        <AppIcon name="check" :size="16" :stroke="2.6" />Als erledigt melden
      </button>
      <button v-else-if="!task.signedBy" type="button" class="btn btn-primary" @click="signTask(task, todaysLeader)">
        <AppIcon name="shield" :size="16" />Abzeichnen als {{ PEOPLE[todaysLeader].name }}
      </button>
      <button v-else type="button" class="btn" @click="emit('close')">Schließen</button>
    </template>
  </AppModal>
</template>

<style scoped>
.tiles { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 10px; }
.tile {
  padding: 10px 12px; border-radius: 10px; border: 1px solid var(--border);
  display: flex; flex-direction: column; align-items: flex-start; gap: 4px; font-size: 14px;
}
.tile > span:first-child { font-size: 12px; color: var(--muted); }
.deadline { color: var(--orange-ink); }
.desc { font-size: 15px; line-height: 1.55; }
.links { display: flex; flex-wrap: wrap; gap: 8px 20px; font-size: 13.5px; }
.links a { display: inline-flex; align-items: center; gap: 6px; font-weight: 600; text-decoration: none; }
.checklist { display: flex; flex-direction: column; border: 1px solid var(--border); border-radius: 12px; overflow: hidden; }
.check {
  display: flex; align-items: center; gap: 12px; min-height: 46px; padding: 0 14px;
  border-bottom: 1px solid var(--border-soft); font-size: 14px; cursor: pointer;
}
.check:last-child { border-bottom: 0; }
.check.done { color: var(--muted); text-decoration: line-through; }
.check input { width: 20px; height: 20px; accent-color: var(--accent); }
.signed { display: inline-flex; align-items: center; gap: 6px; color: var(--green-ink); font-weight: 600; }
</style>
