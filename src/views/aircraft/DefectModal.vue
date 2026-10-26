<script setup lang="ts">
import { computed, ref } from 'vue'
import { addDefectNote, createTaskFromDefect, setDefectOwner, setDefectStatus, state } from '../../store'
import type { Defect } from '../../types'
import { fmtDate } from '../../utils/date'
import AppIcon from '../../components/AppIcon.vue'
import AppModal from '../../components/AppModal.vue'
import HistoryList from '../../components/HistoryList.vue'
import PriorityBadge from '../../components/PriorityBadge.vue'

const props = defineProps<{ defect: Defect }>()
const emit = defineEmits<{ close: [] }>()

const OWNERS = ['noch niemand', 'Matze', 'Heinrich', 'Jonas', 'Felix', 'Lorenz']
const STATUS_TEXT = { offen: 'Offen', arbeit: 'In Arbeit', erledigt: 'Erledigt' }

const task = computed(() => state.tasks.find((t) => t.id === props.defect.taskId))
const owner = computed({
  get: () => props.defect.owner,
  set: (v: string) => setDefectOwner(props.defect, v),
})
const note = ref('')
function saveNote() {
  if (!note.value.trim()) return
  addDefectNote(props.defect, note.value.trim())
  note.value = ''
}
</script>

<template>
  <AppModal :title="defect.title" :width="820" @close="emit('close')">
    <template #kicker>
      <span>{{ defect.source === 'vf' ? 'Mangel aus Vereinsflieger' : 'Befund' }}</span>
      <span aria-hidden="true">·</span>
      <span>{{ defect.status === 'open' ? 'Offen' : 'Erledigt' }}</span>
      <PriorityBadge :priority="defect.priority" />
    </template>

    <div class="grid">
      <div class="main">
        <p class="desc">{{ defect.desc }}</p>

        <div v-if="defect.photos" class="photos">
          <div v-for="n in defect.photos" :key="n" class="photo"><AppIcon name="image" :size="22" :stroke="1.8" /><span>Foto {{ n }}</span></div>
        </div>

        <div class="facts">
          <span class="muted">Gemeldet</span><strong>{{ fmtDate(defect.reportedAt) }} · {{ defect.reportedBy }}</strong>
          <label for="df-owner" class="muted">Zuständig</label>
          <select id="df-owner" v-model="owner" class="select owner">
            <option v-for="o in OWNERS" :key="o" :value="o">{{ o }}</option>
          </select>
          <span class="muted">Arbeitspaket</span>
          <span>
            <RouterLink v-if="task" :to="`/flugzeug/${defect.aircraftId}/arbeitspakete`" class="strong">{{ task.title }} · {{ STATUS_TEXT[task.status] }}</RouterLink>
            <button v-else type="button" class="btn btn-sm" @click="createTaskFromDefect(defect)">Arbeitspaket erstellen</button>
          </span>
        </div>

        <div class="field">
          <label for="df-note">Update hinzufügen</label>
          <textarea id="df-note" v-model="note" rows="2" class="textarea" placeholder="z. B. Ersatzteil bestellt, Reparatur erledigt …" />
          <button type="button" class="btn btn-sm save" @click="saveNote">Update speichern</button>
        </div>

        <div>
          <button v-if="defect.status === 'open'" type="button" class="btn btn-primary" @click="setDefectStatus(defect, 'done')"><AppIcon name="check" :size="16" :stroke="2.6" />Als erledigt markieren</button>
          <button v-else type="button" class="btn" @click="setDefectStatus(defect, 'open')">Wieder öffnen</button>
        </div>
      </div>
      <HistoryList :entries="defect.history" />
    </div>
  </AppModal>
</template>

<style scoped>
.grid { display: grid; grid-template-columns: minmax(0, 1fr) 280px; gap: 24px; align-items: start; }
.main { display: flex; flex-direction: column; gap: 18px; }
.desc { font-size: 15px; line-height: 1.55; }
.photos { display: flex; gap: 10px; flex-wrap: wrap; }
.photo {
  width: 150px; height: 110px; border-radius: 10px; background: #DDE3EA; color: var(--muted);
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; font-size: 12px;
}
.facts { display: grid; grid-template-columns: 130px minmax(0, 1fr); row-gap: 10px; column-gap: 16px; align-items: center; font-size: 14px; }
.owner { height: 40px; max-width: 220px; font-weight: 600; }
.strong { font-weight: 600; text-decoration: none; }
.save { align-self: flex-start; }
@media (max-width: 760px) {
  .grid { grid-template-columns: 1fr; }
  .facts { grid-template-columns: 110px minmax(0, 1fr); }
}
</style>
