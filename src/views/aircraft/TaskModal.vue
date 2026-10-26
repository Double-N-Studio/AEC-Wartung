<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  aircraftLabel, can, deleteTask, finishTask, reopenTask, resetTaskToOpen, setChecklistItem, signer, signTask,
  startTask, state, unsignTask, userName,
} from '../../store'
import type { Task } from '../../types'
import { fmtDay, fmtWhen } from '../../utils/date'
import AppIcon from '../../components/AppIcon.vue'
import AppModal from '../../components/AppModal.vue'
import ConfirmModal from '../../components/ConfirmModal.vue'
import HistoryList from '../../components/HistoryList.vue'
import LevelBadge from '../../components/LevelBadge.vue'

const props = defineProps<{ task: Task }>()
const emit = defineEmits<{ close: []; edit: [] }>()

const STATUS = { offen: ['Offen', 'pill-gray'], arbeit: ['In Arbeit', 'pill-accent'], erledigt: ['Erledigt', 'pill-green'] }
const defect = computed(() => state.defects.find((d) => d.id === props.task.defectId))
const doc = computed(() => state.documents.find((d) => d.id === props.task.docId))
const checked = computed(() => props.task.checklist.filter((c) => c.done).length)
const started = computed(() => props.task.history.find((h) => h.text === 'Arbeit gestartet'))
// Abgezeichnete Karten sind gesperrt, bis die Werkstattleitung die Abzeichnung zurücknimmt.
const editable = computed(() => can('edit') && !props.task.signedBy)

const confirming = ref(false)
function remove() {
  deleteTask(props.task)
  emit('close')
}
</script>

<template>
  <AppModal :title="task.title" icon="wrench" :subtitle="`Kanban-Karte · ${aircraftLabel(task.aircraftId)}`" @close="emit('close')">
    <template #status>
      <span class="pill" :class="STATUS[task.status][1]">{{ STATUS[task.status][0] }}</span>
    </template>
    <template v-if="editable" #tools>
      <button type="button" class="tool" aria-label="Bearbeiten" title="Bearbeiten" @click="emit('edit')"><AppIcon name="pen" :size="19" /></button>
      <button type="button" class="tool" aria-label="Löschen" title="Löschen" @click="confirming = true"><AppIcon name="trash" :size="19" /></button>
    </template>

    <div class="tiles">
      <div class="tile"><span>Geeignet für</span><LevelBadge :level="task.level" /></div>
      <div class="tile"><span>Dauer</span><strong>{{ task.duration }}</strong></div>
      <div v-if="task.checklist.length" class="tile"><span>Checkliste</span><strong>{{ checked }} von {{ task.checklist.length }}</strong></div>
      <div v-if="task.deadline" class="tile"><span>Frist</span><strong class="deadline">{{ fmtDay(task.deadline) }}</strong></div>
    </div>

    <p class="desc">{{ task.desc }}</p>

    <RouterLink v-if="defect" :to="{ path: `/flugzeug/${task.aircraftId}/maengel`, query: { befund: defect.id } }" class="origin">
      <span class="origin-icon"><AppIcon :name="defect.source === 'vf' ? 'cloud' : 'camera'" :size="18" :stroke="1.9" /></span>
      <span class="origin-text">
        <span class="origin-label">Entstanden aus {{ defect.source === 'vf' ? 'Mangel (Vereinsflieger)' : 'Befund' }}</span>
        <strong>{{ defect.title }}</strong>
      </span>
      <span class="pill" :class="defect.status === 'open' ? 'pill-gray' : 'pill-green'">{{ defect.status === 'open' ? 'Offen' : 'Erledigt' }}</span>
      <AppIcon name="chevronRight" :size="16" class="muted" />
    </RouterLink>

    <div v-if="doc" class="links">
      <RouterLink :to="{ path: `/flugzeug/${task.aircraftId}/dokumente`, query: { dokument: doc.id } }"><AppIcon name="file" :size="16" />{{ doc.title }}</RouterLink>
    </div>

    <div v-if="task.checklist.length" class="checklist" role="group" aria-label="Checkliste">
      <label v-for="(item, i) in task.checklist" :key="i" class="check" :class="{ done: item.done, locked: !editable }">
        <input
          type="checkbox" :checked="item.done" :disabled="!editable"
          @change="setChecklistItem(task, i, ($event.target as HTMLInputElement).checked)"
        ><span>{{ item.text }}</span>
      </label>
    </div>

    <HistoryList :entries="task.history" />

    <template #meta>
      <span v-if="task.signedBy" class="signed"><AppIcon name="shield" :size="15" />Abgezeichnet von {{ userName(task.signedBy) }} · {{ fmtWhen(task.signedAt!) }}</span>
      <span v-else-if="task.status === 'erledigt'">Erledigt von {{ userName(task.doneBy) }} · {{ fmtWhen(task.doneAt!) }}</span>
      <span v-else-if="started">Gestartet von {{ userName(started.who) }} · {{ fmtWhen(started.at) }}</span>
    </template>
    <template #footer>
      <template v-if="editable && task.status === 'offen'">
        <button type="button" class="btn btn-primary" @click="startTask(task)">Arbeit starten</button>
      </template>
      <template v-else-if="editable && task.status === 'arbeit'">
        <button type="button" class="btn btn-ghost" @click="resetTaskToOpen(task)">Zurück auf Offen</button>
        <button type="button" class="btn btn-primary" @click="finishTask(task)"><AppIcon name="check" :size="16" :stroke="2.6" />Als erledigt melden</button>
      </template>
      <template v-else-if="editable">
        <button type="button" class="btn btn-ghost" @click="reopenTask(task)">Wieder in Arbeit</button>
        <button v-if="can('lead')" type="button" class="btn btn-primary" @click="signTask(task)">
          <AppIcon name="shield" :size="16" />Abzeichnen als {{ userName(signer()) }}
        </button>
      </template>
      <template v-else>
        <button v-if="task.signedBy && can('lead')" type="button" class="btn btn-ghost" @click="unsignTask(task)">Abzeichnung zurücknehmen</button>
        <button type="button" class="btn" @click="emit('close')">Schließen</button>
      </template>
    </template>
  </AppModal>

  <ConfirmModal
    v-if="confirming" title="Kanban-Karte löschen?" :text="`„${task.title}“ wird mit Checkliste und Verlauf gelöscht.`"
    @confirm="remove" @close="confirming = false"
  />
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
.origin {
  display: flex; align-items: center; gap: 12px; padding: 12px 14px; border-radius: 12px;
  border: 1px solid var(--border); background: var(--subtle); color: var(--text); text-decoration: none;
}
.origin:hover { border-color: var(--border-strong); }
.origin-icon {
  width: 36px; height: 36px; flex-shrink: 0; border-radius: 10px; background: var(--accent-soft); color: var(--accent-ink);
  display: inline-flex; align-items: center; justify-content: center;
}
.origin-text { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; font-size: 14px; }
.origin-label { font-size: 12px; font-weight: 600; color: var(--muted); }
.links { display: flex; flex-wrap: wrap; gap: 8px 20px; font-size: 13.5px; }
.links a { display: inline-flex; align-items: center; gap: 6px; font-weight: 600; text-decoration: none; }
.checklist { display: flex; flex-direction: column; border: 1px solid var(--border); border-radius: 12px; overflow: hidden; }
.check {
  display: flex; align-items: center; gap: 12px; min-height: 46px; padding: 0 14px;
  border-bottom: 1px solid var(--border-soft); font-size: 14px; cursor: pointer;
}
.check:last-child { border-bottom: 0; }
.check.done { color: var(--muted); text-decoration: line-through; }
.check.locked { cursor: default; }
.check input { width: 20px; height: 20px; accent-color: var(--accent); }
.signed { display: inline-flex; align-items: center; gap: 6px; color: var(--green-ink); font-weight: 600; }
</style>
