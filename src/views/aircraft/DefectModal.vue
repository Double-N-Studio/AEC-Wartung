<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  addDefectNote, aircraftLabel, can, createTaskFromDefect, deleteDefect, people, setDefectOwner, setDefectStatus, state,
  unlinkDefectTask, userName,
} from '../../store'
import type { Defect } from '../../types'
import { fmtDate } from '../../utils/date'
import AppIcon from '../../components/AppIcon.vue'
import AppModal from '../../components/AppModal.vue'
import ConfirmModal from '../../components/ConfirmModal.vue'
import HistoryList from '../../components/HistoryList.vue'
import PriorityBadge from '../../components/PriorityBadge.vue'

const props = defineProps<{ defect: Defect }>()
const emit = defineEmits<{ close: []; edit: [] }>()

const STATUS_TEXT = { offen: 'Offen', arbeit: 'In Arbeit', erledigt: 'Erledigt' }
const task = computed(() => state.tasks.find((t) => t.id === props.defect.taskId))
const owners = computed(() => {
  const list = people()
  const current = props.defect.owner
  return current && !list.some((u) => u.id === current) ? [...list, { id: current, name: userName(current) }] : list
})
const owner = computed({
  get: () => props.defect.owner ?? '',
  set: (v: string) => setDefectOwner(props.defect, v || null),
})

const note = ref('')
function saveNote() {
  if (!note.value.trim()) return
  addDefectNote(props.defect, note.value.trim())
  note.value = ''
}

// Mängel kommen aus Vereinsflieger und werden dort bearbeitet; eigene Befunde hier.
const ownFinding = computed(() => props.defect.source === 'befund' && can('edit'))
const confirming = ref(false)
function remove() {
  deleteDefect(props.defect)
  emit('close')
}
</script>

<template>
  <AppModal
    :title="defect.title" icon="alert" @close="emit('close')"
    :subtitle="`${defect.source === 'vf' ? 'Mangel aus Vereinsflieger' : 'Befund'} · ${aircraftLabel(defect.aircraftId)}`"
  >
    <template #status>
      <PriorityBadge :priority="defect.priority" />
      <span class="pill" :class="defect.status === 'open' ? 'pill-orange' : 'pill-green'">{{ defect.status === 'open' ? 'Offen' : 'Erledigt' }}</span>
    </template>
    <template v-if="ownFinding" #tools>
      <button type="button" class="tool" aria-label="Bearbeiten" title="Bearbeiten" @click="emit('edit')"><AppIcon name="pen" :size="19" /></button>
      <button type="button" class="tool" aria-label="Löschen" title="Löschen" @click="confirming = true"><AppIcon name="trash" :size="19" /></button>
    </template>

    <p class="desc">{{ defect.desc }}</p>

    <div v-if="defect.photos" class="photos">
      <div v-for="n in defect.photos" :key="n" class="photo"><AppIcon name="image" :size="22" :stroke="1.8" /><span>Foto {{ n }}</span></div>
    </div>

    <div class="facts">
      <label for="df-owner" class="muted">Zuständig</label>
      <select v-if="can('edit')" id="df-owner" v-model="owner" class="select owner">
        <option value="">noch niemand</option>
        <option v-for="o in owners" :key="o.id" :value="o.id">{{ o.name }}</option>
      </select>
      <strong v-else>{{ defect.owner ? userName(defect.owner) : 'noch niemand' }}</strong>
      <span class="muted">Kanban</span>
      <span class="task-cell">
        <template v-if="task">
          <RouterLink :to="{ path: `/flugzeug/${defect.aircraftId}/kanban`, query: { paket: task.id } }" class="strong task-link">
            <AppIcon name="wrench" :size="15" />{{ task.title }}<span class="pill pill-gray">{{ STATUS_TEXT[task.status] }}</span>
          </RouterLink>
          <button v-if="can('edit')" type="button" class="link-btn" @click="unlinkDefectTask(defect)"><AppIcon name="unlink" :size="14" />Verknüpfung lösen</button>
        </template>
        <button v-else-if="can('edit')" type="button" class="btn btn-sm" @click="createTaskFromDefect(defect)">Kanban-Karte erstellen</button>
        <span v-else class="muted">–</span>
      </span>
    </div>

    <div v-if="can('edit')" class="field">
      <label for="df-note">Update hinzufügen</label>
      <textarea id="df-note" v-model="note" rows="2" class="textarea" placeholder="z. B. Ersatzteil bestellt, Reparatur erledigt …" />
      <button type="button" class="btn btn-sm save" @click="saveNote">Update speichern</button>
    </div>

    <HistoryList :entries="defect.history" />

    <template #meta>Gemeldet von {{ userName(defect.reportedBy) }} · {{ fmtDate(defect.reportedAt) }}</template>
    <template #footer>
      <template v-if="can('edit')">
        <button v-if="defect.status === 'open'" type="button" class="btn btn-primary" @click="setDefectStatus(defect, 'done')"><AppIcon name="check" :size="16" :stroke="2.6" />Als erledigt markieren</button>
        <button v-else type="button" class="btn" @click="setDefectStatus(defect, 'open')">Wieder öffnen</button>
      </template>
      <button v-else type="button" class="btn" @click="emit('close')">Schließen</button>
    </template>
  </AppModal>

  <ConfirmModal
    v-if="confirming" title="Befund löschen?" :text="`„${defect.title}“ wird mit Fotos und Verlauf gelöscht. Eine verknüpfte Kanban-Karte bleibt bestehen.`"
    @confirm="remove" @close="confirming = false"
  />
</template>

<style scoped>
.desc { font-size: 15px; line-height: 1.55; }
.photos { display: flex; gap: 10px; flex-wrap: wrap; }
.photo {
  width: 150px; height: 110px; border-radius: 10px; background: #DDE3EA; color: var(--muted);
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; font-size: 12px;
}
.facts { display: grid; grid-template-columns: 130px minmax(0, 1fr); row-gap: 10px; column-gap: 16px; align-items: center; font-size: 14px; }
.owner { height: 40px; max-width: 220px; font-weight: 600; }
.strong { font-weight: 600; text-decoration: none; }
.task-cell { display: flex; align-items: center; flex-wrap: wrap; gap: 6px 14px; }
.task-link { display: inline-flex; align-items: center; flex-wrap: wrap; gap: 6px 8px; }
.save { align-self: flex-start; }
@media (max-width: 760px) {
  .facts { grid-template-columns: 110px minmax(0, 1fr); }
}
</style>
