<script setup lang="ts">
import { reactive } from 'vue'
import { aircraftLabel, createDefect, updateDefect, type DefectInput } from '../../store'
import type { Defect, Priority } from '../../types'
import AppIcon from '../../components/AppIcon.vue'
import AppModal from '../../components/AppModal.vue'

/** Befund erfassen oder (mit defect) bearbeiten. Fotos sind im Mockup Platzhalter. */
const props = defineProps<{ aircraftId: string; defect?: Defect }>()
const emit = defineEmits<{ close: [] }>()

const PRIORITIES: Priority[] = ['Sehr niedrig', 'Niedrig', 'Normal', 'Hoch']
const MAX_PHOTOS = 6
const d = props.defect
const form = reactive<DefectInput>({ title: d?.title ?? '', desc: d?.desc === '–' ? '' : d?.desc ?? '', priority: d?.priority ?? 'Normal', photos: d?.photos ?? 0 })

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
        <div class="photos">
          <div v-for="n in form.photos" :key="n" class="photo">
            <AppIcon name="image" :size="22" :stroke="1.8" /><span>Foto {{ n }}</span>
            <button type="button" class="photo-remove" :aria-label="`Foto ${n} entfernen`" @click="form.photos--"><AppIcon name="x" :size="14" :stroke="2.4" /></button>
          </div>
          <button v-if="form.photos < MAX_PHOTOS" type="button" class="shoot" @click="form.photos++"><AppIcon name="camera" :size="24" :stroke="1.8" />Foto aufnehmen</button>
        </div>
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
.photos { display: flex; gap: 10px; flex-wrap: wrap; }
.photo {
  position: relative; width: 96px; height: 96px; border-radius: 12px; background: #DDE3EA; color: var(--muted);
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; font-size: 12px;
}
.shoot {
  flex: 1; min-width: 140px; height: 96px; border-radius: 12px; border: 1.5px dashed #A3ADB9; background: var(--subtle);
  font-size: 14px; font-weight: 600; color: var(--accent-ink); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px;
}
.photo-remove {
  position: absolute; top: 4px; right: 4px; width: 26px; height: 26px; border: 0; border-radius: 50%;
  display: inline-flex; align-items: center; justify-content: center; background: var(--surface); color: var(--text-2);
  box-shadow: 0 1px 3px rgba(23, 32, 43, 0.2);
}
</style>
