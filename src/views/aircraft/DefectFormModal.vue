<script setup lang="ts">
import { reactive } from 'vue'
import { aircraftLabel, createDefect, updateDefect, userName, type DefectInput } from '../../store'
import { useChangedElsewhere } from '../../sync'
import type { Defect, Priority } from '../../types'
import PhotoStrip from '../../components/PhotoStrip.vue'
import AppModal from '../../components/AppModal.vue'
import ConflictNote from '../../components/ConflictNote.vue'

/** Record a finding or (with defect) edit one. */
const props = defineProps<{ aircraftId: string; defect?: Defect }>()
const emit = defineEmits<{ close: [] }>()

const PRIORITIES: Priority[] = ['Sehr niedrig', 'Niedrig', 'Normal', 'Hoch']
const initial = (d = props.defect): DefectInput => ({ title: d?.title ?? '', desc: d?.desc === '–' ? '' : d?.desc ?? '', priority: d?.priority ?? 'Normal', photos: [...(d?.photos ?? [])] })
const form = reactive<DefectInput>(initial())
const { changed, reset } = useChangedElsewhere(() => props.defect?.id)
function reload() {
  Object.assign(form, initial())
  reset()
}

function submit() {
  if (!form.title.trim()) return
  if (props.defect) updateDefect(props.defect, form)
  else createDefect(props.aircraftId, form)
  emit('close')
}
</script>

<template>
  <AppModal :title="props.defect ? 'Befund bearbeiten' : 'Befund erfassen'" icon="alert" :subtitle="aircraftLabel(props.aircraftId)" :width="600" @close="emit('close')">
    <form id="defect-form" class="form" @submit.prevent="submit">
      <ConflictNote v-if="changed" :who="userName(props.defect?.history[0]?.who)" @reload="reload" />
      <div class="field">
        <label for="nd-title">Kurzbeschreibung</label>
        <input id="nd-title" v-model="form.title" class="input" required placeholder="z. B. Delle an der Rumpfunterseite">
      </div>
      <div class="field">
        <label for="nd-desc">Details</label>
        <textarea id="nd-desc" v-model="form.desc" rows="3" class="textarea" placeholder="Wo genau, wie groß, seit wann …" />
      </div>
      <div class="field">
        <span class="field-label">Fotos</span>
        <PhotoStrip v-model="form.photos" editable />
      </div>
      <div class="field">
        <label for="nd-prio">Priorität</label>
        <select id="nd-prio" v-model="form.priority" class="select">
          <option v-for="p in PRIORITIES" :key="p" :value="p">{{ p }}</option>
        </select>
      </div>
    </form>
    <template #footer>
      <button type="button" class="btn btn-ghost" @click="emit('close')">Abbrechen</button>
      <button type="submit" form="defect-form" class="btn btn-primary">Speichern</button>
    </template>
  </AppModal>
</template>

<style scoped>
.form { display: flex; flex-direction: column; gap: 16px; }
</style>
