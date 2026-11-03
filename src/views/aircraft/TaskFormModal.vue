<script setup lang="ts">
import { computed, reactive } from 'vue'
import { aircraftLabel, createTask, docsFor, state, taskInput, updateTask, userName } from '../../store'
import { useChangedElsewhere } from '../../sync'
import type { Task } from '../../types'
import { DURATIONS, LEVEL_KEYS, LEVELS } from '../../utils/levels'
import AppModal from '../../components/AppModal.vue'
import ConflictNote from '../../components/ConflictNote.vue'
import LevelBars from '../../components/LevelBars.vue'

/** Kanban-Karte anlegen oder (mit task) bearbeiten. */
const props = defineProps<{ aircraftId: string; task?: Task }>()
const emit = defineEmits<{ close: [] }>()

const form = reactive(taskInput(props.task))
const { changed, reset } = useChangedElsewhere(() => props.task?.id)
function reload() {
  Object.assign(form, taskInput(props.task))
  reset()
}
const openDefects = computed(() => state.defects.filter((d) =>
  d.aircraftId === props.aircraftId && (d.id === props.task?.defectId || (d.status === 'open' && !d.taskId))))
const docs = computed(() => docsFor(props.aircraftId))
const durations = computed(() => (DURATIONS.includes(form.duration) ? DURATIONS : [form.duration, ...DURATIONS]))

function submit() {
  if (!form.title.trim()) return
  if (props.task) updateTask(props.task, form)
  else createTask(props.aircraftId, form)
  emit('close')
}
</script>

<template>
  <AppModal
    :title="props.task ? 'Kanban-Karte bearbeiten' : 'Kanban-Karte anlegen'" icon="wrench" :width="760" @close="emit('close')"
    :subtitle="aircraftLabel(props.aircraftId)"
  >
    <form id="task-form" class="form" @submit.prevent="submit">
      <ConflictNote v-if="changed" :who="userName(props.task?.history[0]?.who)" @reload="reload" />
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
      <div class="two">
        <div class="field">
          <label for="nt-dur">Geschätzte Dauer</label>
          <select id="nt-dur" v-model="form.duration" class="select">
            <option v-for="d in durations" :key="d" :value="d">{{ d }}</option>
          </select>
        </div>
        <div class="field">
          <label for="nt-deadline">Frist <span class="muted hint">(optional)</span></label>
          <input id="nt-deadline" v-model="form.deadline" type="date" class="input">
        </div>
      </div>
      <div class="field">
        <label for="nt-desc">Beschreibung</label>
        <textarea id="nt-desc" v-model="form.desc" rows="2" class="textarea" placeholder="Was ist zu tun? Worauf muss man achten?" />
      </div>
      <div class="field">
        <label for="nt-check">Checkliste <span class="muted hint">(ein Schritt pro Zeile, optional)</span></label>
        <textarea id="nt-check" v-model="form.checklist" rows="3" class="textarea" placeholder="Anschlüsse reinigen&#10;Neu fetten&#10;Sicherung prüfen" />
        <span v-if="props.task?.checklist.some((c) => c.done)" class="muted hint">Abgehakte Schritte bleiben abgehakt, solange ihr Text gleich bleibt.</span>
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
          <select id="nt-doc" v-model="form.docId" class="select">
            <option value="">Kein Dokument</option>
            <option v-for="d in docs" :key="d.id" :value="d.id">{{ d.title }}</option>
          </select>
        </div>
      </div>
    </form>
    <template #footer>
      <button type="button" class="btn btn-ghost" @click="emit('close')">Abbrechen</button>
      <button type="submit" form="task-form" class="btn btn-primary">{{ props.task ? 'Speichern' : 'Anlegen' }}</button>
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
.two { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.hint { font-weight: 500; }
@media (max-width: 640px) {
  .two { grid-template-columns: 1fr; }
}
</style>
