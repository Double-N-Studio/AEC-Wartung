<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import { createItem, itemInput, linkOrderToItem, state, updateItem } from '../../store'
import type { InventoryItem, Order } from '../../types'
import { FLAG } from '../../utils/stock'
import AppModal from '../../components/AppModal.vue'
import LevelPicker from '../../components/LevelPicker.vue'

/**
 * Inventur-Artikel anlegen oder (mit item) bearbeiten.
 * preset: Vorbelegung beim Anlegen, order: Bestellung ohne Artikel, die danach dem neuen Artikel zugeordnet wird.
 */
const props = defineProps<{ item?: InventoryItem; preset?: { name?: string; kind?: InventoryItem['kind']; fits?: string }; order?: Order }>()
const emit = defineEmits<{ close: []; saved: [item: InventoryItem] }>()

const ALL = 'alle Flugzeuge'
const presetValues = Object.fromEntries(Object.entries(props.item ? {} : props.preset ?? {}).filter(([, v]) => v !== undefined))
const form = reactive({ ...itemInput(props.item), ...presetValues })
const types = computed(() => state.aircraft.map((a) => a.type))
const fitsList = computed(() => (form.fits && form.fits !== ALL ? form.fits.split(', ') : []))

function toggleType(type: string) {
  const set = new Set(fitsList.value)
  if (set.has(type)) set.delete(type)
  else set.add(type)
  form.fits = types.value.filter((t) => set.has(t)).join(', ')
}

// Zählweise wechseln: Bestand sinnvoll übertragen statt eine Stückzahl als Füllstand zu deuten.
watch(() => form.mode, (mode, before) => {
  if (mode === before) return
  form.qty = mode === 'flag' ? (form.qty > 0 ? FLAG.full : FLAG.empty) : 0
  if (mode === 'count' && !form.unit[0]) form.unit = ['Stk.', 'Stk.']
})

function submit() {
  if (!form.name.trim()) return
  let item = props.item
  if (item) {
    updateItem(item, form)
  } else {
    item = createItem(form)
    if (props.order) linkOrderToItem(props.order, item)
  }
  emit('saved', item)
}
</script>

<template>
  <AppModal
    :title="props.item ? 'Artikel bearbeiten' : 'Artikel anlegen'" icon="box" :width="620" @close="emit('close')"
    :subtitle="props.item ? props.item.name : props.order ? `Für die Bestellung „${props.order.name}“` : 'Neuer Artikel in der Inventur'"
  >
    <form id="item-form" class="form" @submit.prevent="submit">
      <div class="field">
        <label for="if-name">Name</label>
        <input id="if-name" v-model="form.name" class="input" required placeholder="z. B. Schleifpapier P1000">
      </div>
      <div class="two">
        <div class="field">
          <span class="field-label">Art</span>
          <div class="segmented wide" role="group" aria-label="Art">
            <button type="button" :aria-pressed="form.kind === 'vs'" @click="form.kind = 'vs'">Verbrauchsstoff</button>
            <button type="button" :aria-pressed="form.kind === 'et'" @click="form.kind = 'et'">Ersatzteil</button>
          </div>
        </div>
        <div class="field">
          <label for="if-loc">Lagerort</label>
          <input id="if-loc" v-model="form.location" class="input" placeholder="z. B. Regal A, Fach 2">
        </div>
      </div>

      <div v-if="form.kind === 'et'" class="field">
        <span class="field-label">Passt für</span>
        <div class="chips" role="group" aria-label="Passt für">
          <button type="button" class="chip" :aria-pressed="form.fits === ALL" @click="form.fits = form.fits === ALL ? '' : ALL">Alle Flugzeuge</button>
          <button
            v-for="t in types" :key="t" type="button" class="chip" :aria-pressed="fitsList.includes(t)"
            :disabled="form.fits === ALL" @click="toggleType(t)"
          >{{ t }}</button>
        </div>
      </div>

      <div class="field">
        <span class="field-label">Zählweise</span>
        <div class="segmented wide" role="group" aria-label="Zählweise">
          <button type="button" :aria-pressed="form.mode === 'count'" @click="form.mode = 'count'">Stückzahl</button>
          <button type="button" :aria-pressed="form.mode === 'flag'" @click="form.mode = 'flag'">Genug / Fast leer / Leer</button>
        </div>
      </div>

      <div v-if="form.mode === 'count'" class="three">
        <div class="field">
          <label for="if-qty">Bestand</label>
          <input id="if-qty" v-model.number="form.qty" type="number" min="0" class="input">
        </div>
        <div class="field">
          <label for="if-unit1">Einheit (eins)</label>
          <input id="if-unit1" v-model="form.unit[0]" class="input" placeholder="Dose">
        </div>
        <div class="field">
          <label for="if-unit2">Einheit (mehrere)</label>
          <input id="if-unit2" v-model="form.unit[1]" class="input" placeholder="Dosen">
        </div>
      </div>
      <div v-else class="field">
        <span class="field-label">Bestand</span>
        <LevelPicker v-model="form.qty" big />
      </div>
    </form>
    <template #footer>
      <button type="button" class="btn btn-ghost" @click="emit('close')">Abbrechen</button>
      <button type="submit" form="item-form" class="btn btn-primary">{{ props.item ? 'Speichern' : 'Anlegen' }}</button>
    </template>
  </AppModal>
</template>

<style scoped>
.form { display: flex; flex-direction: column; gap: 16px; }
.two { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.three { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
.segmented.wide { display: flex; }
.segmented.wide button { flex: 1; height: 38px; }
.chips { display: flex; flex-wrap: wrap; gap: 8px; }
.chip {
  height: 36px; padding: 0 14px; border-radius: 999px; border: 1px solid var(--border-strong); background: var(--surface);
  font-size: 13px; font-weight: 600; color: var(--text-2);
}
.chip[aria-pressed='true'] { border-color: var(--accent); background: var(--accent-soft); color: var(--accent-ink); }
.chip:disabled { opacity: 0.45; cursor: default; }
@media (max-width: 640px) {
  .two, .three { grid-template-columns: 1fr; }
}
</style>
