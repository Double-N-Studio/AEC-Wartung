<script setup lang="ts">
import { computed, reactive } from 'vue'
import { aircraftLabel, createTask, state, type NewTask } from '../../store'
import { LEVEL_KEYS, LEVELS } from '../../utils/levels'
import AppModal from '../../components/AppModal.vue'
import LevelBars from '../../components/LevelBars.vue'

const props = defineProps<{ aircraftId: string }>()
const emit = defineEmits<{ close: [] }>()

const form = reactive<NewTask>({ title: '', level: 'ein', duration: '~1 h', desc: '', checklist: '', defectId: '', doc: '' })
const openDefects = computed(() => state.defects.filter((d) => d.aircraftId === props.aircraftId && d.status === 'open' && !d.taskId))
const docs = computed(() => state.documents.filter((d) => d.aircraftId === props.aircraftId))

function submit() {
  if (!form.title.trim()) return
  createTask(props.aircraftId, form)
  emit('close')
}
</script>

<template>
  <AppModal title="Kanban-Karte anlegen" icon="wrench" :subtitle="aircraftLabel(props.aircraftId)":width="760" @close="emit('close')">
    <form id="new-task" class="form" @submit.prevent="submit">
      <div class="field">
        <label for="nt-title">Titel</label>
        <input id="nt-title" v-model="form.title" class="input" required placeholder="z. B. Höhenruder-Anschlüsse schmieren">
      </div>
      <div class="field">
        <span class="field-label">Geeignet für</span>
        <div class="levels" role="group" aria-label="Geeignet für">
          <button
            v-for="k in LEVEL_KEYS" :key="k" type="button" class="level" :aria-pressed="form.level === k"
            :style="form.level === k ? { borderColor: LEVELS[k].fg, background: LEVELS[k].bg, color: LEVELS[k].fg } : {}"
            @click="form.level = k"
          ><LevelBars :bars="LEVELS[k].bars" />{{ LEVELS[k].long }}</button>
        </div>
      </div>
      <div class="field half">
        <label for="nt-dur">Geschätzte Dauer</label>
        <select id="nt-dur" v-model="form.duration" class="select">
          <option v-for="d in ['~0,5 h', '~1 h', '~2 h', '~4 h', 'ganzer Tag']" :key="d" :value="d">{{ d }}</option>
        </select>
      </div>
      <div class="field">
        <label for="nt-desc">Beschreibung</label>
        <textarea id="nt-desc" v-model="form.desc" rows="2" class="textarea" placeholder="Was ist zu tun? Worauf muss man achten?" />
      </div>
      <div class="field">
        <label for="nt-check">Checkliste <span class="muted hint">(ein Schritt pro Zeile, optional)</span></label>
        <textarea id="nt-check" v-model="form.checklist" rows="3" class="textarea" placeholder="Anschlüsse reinigen&#10;Neu fetten&#10;Sicherung prüfen" />
      </div>
      <div class="two">
        <div class="field">
          <label for="nt-defect">Zu Mangel/Befund</label>
          <select id="nt-defect" v-model="form.defectId" class="select">
            <option value="">Keine Verknüpfung</option>
            <option v-for="d in openDefects" :key="d.id" :value="d.id">{{ d.title }}</option>
          </select>
        </div>
        <div class="field">
          <label for="nt-doc">Dokument</label>
          <select id="nt-doc" v-model="form.doc" class="select">
            <option value="">Kein Dokument</option>
            <option v-for="d in docs" :key="d.id" :value="d.title">{{ d.title }}</option>
          </select>
        </div>
      </div>
    </form>
    <template #footer>
      <button type="button" class="btn btn-ghost" @click="emit('close')">Abbrechen</button>
      <button type="submit" form="new-task" class="btn btn-primary">Anlegen</button>
    </template>
  </AppModal>
</template>

<style scoped>
.form { display: flex; flex-direction: column; gap: 16px; }
.levels { display: flex; flex-wrap: wrap; gap: 8px; }
.level {
  height: 44px; padding: 0 16px; border-radius: 10px; border: 1.5px solid var(--border-strong); background: var(--surface);
  font-size: 14px; font-weight: 600; color: var(--text-2); display: inline-flex; align-items: center; gap: 8px;
}
.half { max-width: 50%; }
.two { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.hint { font-weight: 500; }
@media (max-width: 640px) {
  .half { max-width: none; }
  .two { grid-template-columns: 1fr; }
}
</style>
