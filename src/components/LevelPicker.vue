<script setup lang="ts">
import { FLAG } from '../utils/stock'

/** Füllstand für Artikel ohne Stückzahl. Gleich breit wie der QtyStepper (boxed), damit die Zählliste bündig bleibt. */
const props = defineProps<{ modelValue: number; big?: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [value: number] }>()

const OPTIONS = [
  { value: FLAG.full, label: 'Genug', long: 'Genug vorhanden' },
  { value: FLAG.low, label: 'Fast leer', long: 'Fast leer' },
  { value: FLAG.empty, label: 'Leer', long: 'Leer' },
]
</script>

<template>
  <div class="segmented level" :class="{ big: props.big }" role="group" aria-label="Bestand">
    <button
      v-for="o in OPTIONS" :key="o.value" type="button" :class="{ warn: o.value !== FLAG.full }"
      :aria-pressed="props.modelValue === o.value" @click="emit('update:modelValue', o.value)"
    >
      {{ props.big ? o.long : o.label }}
    </button>
  </div>
</template>

<style scoped>
.level { width: 100%; border: 1px solid var(--border); border-radius: 12px; }
.level button { flex: 1; min-width: 0; height: 34px; padding: 0 4px; font-size: 12.5px; }
.level button.warn[aria-pressed='true'] { color: var(--orange-ink); }
@media (max-width: 640px) {
  .level:not(.big) button { padding: 0 2px; font-size: 12px; }
}
.level.big { width: auto; }
.level.big button { flex: none; height: 40px; padding: 0 16px; font-size: 14px; }
</style>
