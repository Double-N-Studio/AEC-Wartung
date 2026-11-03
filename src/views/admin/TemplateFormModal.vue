<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { aircraftTypes, createTemplate, deleteTemplate, state, templateInput, updateTemplate } from '../../store'
import type { TaskTemplate } from '../../types'
import { DURATIONS, LEVEL_KEYS, LEVELS } from '../../utils/levels'
import AppIcon from '../../components/AppIcon.vue'
import AppModal from '../../components/AppModal.vue'
import ConfirmModal from '../../components/ConfirmModal.vue'
import LevelBars from '../../components/LevelBars.vue'

/** Kanban-Vorlage anlegen oder (mit template) bearbeiten. */
const props = defineProps<{ template?: TaskTemplate; preset?: { aircraftType?: string } }>()
const emit = defineEmits<{ close: [] }>()

const form = reactive({ ...templateInput(props.template), ...(props.template ? {} : props.preset) })
const durations = computed(() => (DURATIONS.includes(form.duration) ? DURATIONS : [form.duration, ...DURATIONS]))
// Typ eines ausgemusterten Flugzeugs bleibt wählbar, solange die Vorlage ihn noch nennt.
const types = computed(() => [...new Set([...aircraftTypes(), ...(form.aircraftType ? [form.aircraftType] : [])])])
const docTitles = computed(() => [...new Set(state.documents.map((d) => d.title))].sort((a, b) => a.localeCompare(b, 'de')))

function submit() {
  if (!form.title.trim()) return
  if (props.template) updateTemplate(props.template, form)
  else createTemplate(form)
  emit('close')
}

const confirming = ref(false)
function remove() {
  if (props.template) deleteTemplate(props.template)
  emit('close')
}
</script>

<template>
  <AppModal
    :title="props.template ? 'Vorlage bearbeiten' : 'Vorlage anlegen'" icon="list" :width="760" @close="emit('close')"
    subtitle="Kanban-Vorlage"
  >
    <template v-if="props.template" #tools>
      <button type="button" class="tool" aria-label="Löschen" title="Löschen" @click="confirming = true"><AppIcon name="trash" :size="19" /></button>
    </template>
    <form id="template-form" class="form" @submit.prevent="submit">
      <div class="field">
        <label for="tf-title">Titel</label>
        <input id="tf-title" v-model="form.title" class="input" required placeholder="z. B. Flügel: Putzen">
      </div>
      <div class="two">
        <div class="field">
          <label for="tf-type">Gilt für</label>
          <select id="tf-type" v-model="form.aircraftType" class="select">
            <option value="">Alle Flugzeuge</option>
            <option v-for="t in types" :key="t" :value="t">nur {{ t }}</option>
          </select>
        </div>
        <div class="field">
          <label for="tf-dur">Geschätzte Dauer</label>
          <select id="tf-dur" v-model="form.duration" class="select">
            <option v-for="d in durations" :key="d" :value="d">{{ d }}</option>
          </select>
        </div>
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
      <div class="field">
        <label for="tf-desc">Beschreibung</label>
        <textarea id="tf-desc" v-model="form.desc" rows="2" class="textarea" placeholder="Was ist zu tun? Worauf muss man achten?" />
      </div>
      <div class="field">
        <label for="tf-check">Checkliste <span class="muted hint">(ein Schritt pro Zeile, optional)</span></label>
        <textarea id="tf-check" v-model="form.checklist" rows="3" class="textarea" />
      </div>
      <div class="field">
        <label for="tf-doc">Dokument <span class="muted hint">(Titel, optional)</span></label>
        <input id="tf-doc" v-model="form.docTitle" class="input" list="tf-doc-titles" placeholder="z. B. Wartungshandbuch">
        <datalist id="tf-doc-titles"><option v-for="t in docTitles" :key="t" :value="t" /></datalist>
        <span class="muted hint">Verknüpft wird das Dokument mit diesem Titel beim jeweiligen Flugzeug.</span>
      </div>
    </form>
    <template #meta>Gilt ab der nächsten Saison und für neue Flugzeuge.</template>
    <template #footer>
      <button type="button" class="btn btn-ghost" @click="emit('close')">Abbrechen</button>
      <button type="submit" form="template-form" class="btn btn-primary">{{ props.template ? 'Speichern' : 'Anlegen' }}</button>
    </template>
  </AppModal>
  <ConfirmModal
    v-if="confirming" title="Vorlage löschen?" :text="`„${form.title}“ wird gelöscht. Bestehende Kanban-Karten bleiben erhalten.`"
    @confirm="remove" @close="confirming = false"
  />
</template>

<style scoped>
.form { display: flex; flex-direction: column; gap: 16px; }
.levels { display: flex; flex-wrap: wrap; gap: 8px; }
.level {
  height: 44px; padding: 0 16px; border-radius: 10px; border: 1.5px solid var(--border-strong); background: var(--surface);
  font-size: 14px; font-weight: 600; color: var(--text-2); display: inline-flex; align-items: center; gap: 8px;
}
.two { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.hint { font-weight: 500; font-size: 12.5px; }
@media (max-width: 640px) {
  .two { grid-template-columns: 1fr; }
}
</style>
