<script setup lang="ts">
import { computed } from 'vue'
import { finishTask, signTask, startTask, state } from '../../store'
import type { PersonKey, Task } from '../../types'
import { PEOPLE } from '../../mock/people'
import { fmtDay, fmtWhen } from '../../utils/date'
import AppIcon from '../../components/AppIcon.vue'
import AppModal from '../../components/AppModal.vue'
import HistoryList from '../../components/HistoryList.vue'
import LevelBadge from '../../components/LevelBadge.vue'

const props = defineProps<{ task: Task }>()
const emit = defineEmits<{ close: [] }>()

const STATUS_TEXT = { offen: 'Offen', arbeit: 'In Arbeit', erledigt: 'Erledigt' }
const defect = computed(() => state.defects.find((d) => d.id === props.task.defectId))
const checked = computed(() => props.task.checklist.filter((c) => c.done).length)
// Abzeichnen übernimmt die heutige Werkstattleitung.
const todaysLeader: PersonKey = 'MA'
</script>

<template>
  <AppModal :title="task.title" :width="860" @close="emit('close')">
    <template #kicker>
      <span class="pill status">{{ STATUS_TEXT[task.status] }}</span>
      <LevelBadge :level="task.level" />
    </template>

    <div class="grid">
      <div class="main">
        <p class="desc">{{ task.desc }}</p>

        <div class="facts">
          <span><AppIcon name="clock" :size="16" />Dauer {{ task.duration }}</span>
          <span v-if="task.deadline" class="deadline"><AppIcon name="calendar" :size="16" />Frist {{ fmtDay(task.deadline) }}</span>
          <RouterLink v-if="task.doc" :to="`/flugzeug/${task.aircraftId}/dokumente`"><AppIcon name="file" :size="16" />{{ task.doc }}</RouterLink>
          <RouterLink v-if="defect" :to="`/flugzeug/${task.aircraftId}/maengel`"><AppIcon name="alert" :size="16" />{{ defect.title }}</RouterLink>
        </div>

        <div v-if="task.checklist.length" class="field">
          <span class="field-label">Checkliste · {{ checked }}/{{ task.checklist.length }}</span>
          <label v-for="(item, i) in task.checklist" :key="i" class="check">
            <input v-model="item.done" type="checkbox"><span>{{ item.text }}</span>
          </label>
        </div>

        <div class="actions">
          <button v-if="task.status === 'offen'" type="button" class="btn btn-primary" @click="startTask(task)">Arbeit starten</button>
          <button v-else-if="task.status === 'arbeit'" type="button" class="btn btn-primary" @click="finishTask(task)">
            <AppIcon name="check" :size="16" :stroke="2.6" />Als erledigt melden
          </button>
          <template v-else-if="!task.signedBy">
            <button type="button" class="btn btn-primary" @click="signTask(task, todaysLeader)"><AppIcon name="shield" :size="16" />Abzeichnen als {{ PEOPLE[todaysLeader].name }}</button>
            <span class="muted small">Werkstattleitung heute</span>
          </template>
          <span v-else class="signed-box"><AppIcon name="shield" :size="16" />Abgezeichnet von {{ task.signedBy }} · {{ fmtWhen(task.signedAt!) }}</span>
        </div>
      </div>
      <HistoryList :entries="task.history" />
    </div>
  </AppModal>
</template>

<style scoped>
.status { background: var(--gray-soft); color: var(--text-2); }
.grid { display: grid; grid-template-columns: minmax(0, 1fr) 290px; gap: 24px; align-items: start; }
.main { display: flex; flex-direction: column; gap: 18px; }
.desc { font-size: 15px; line-height: 1.55; }
.facts { display: flex; flex-wrap: wrap; gap: 20px; font-size: 13.5px; color: var(--text-2); }
.facts > * { display: inline-flex; align-items: center; gap: 6px; }
.facts a { font-weight: 600; text-decoration: none; }
.deadline { color: var(--orange-ink); font-weight: 600; }
.check {
  display: flex; align-items: center; gap: 12px; min-height: 44px; padding: 0 12px;
  border-radius: 10px; background: var(--subtle); font-size: 14px; cursor: pointer;
}
.check input { width: 20px; height: 20px; accent-color: var(--accent); }
.actions { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.small { font-size: 12.5px; }
.signed-box {
  display: inline-flex; align-items: center; gap: 6px; padding: 10px 14px; border-radius: 10px;
  background: var(--green-soft); color: var(--green-ink); font-size: 14px; font-weight: 600;
}
@media (max-width: 760px) {
  .grid { grid-template-columns: 1fr; }
}
</style>
