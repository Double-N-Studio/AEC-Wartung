<script setup lang="ts">
import { ref } from 'vue'
import { can, recordVereinsfliegerSync, state } from '../store'
import { syncNow } from '../api/vereinsflieger'
import { fmtWhen } from '../utils/date'
import AppIcon from './AppIcon.vue'

/** Wann zuletzt mit Vereinsflieger abgeglichen wurde, ob es geklappt hat, und „Jetzt abgleichen“. what: was übernommen wird. */
defineProps<{ what: string }>()

const running = ref(false)
async function sync() {
  running.value = true
  const result = await syncNow()
  recordVereinsfliegerSync(result.ok ? undefined : result.error)
  running.value = false
}
</script>

<template>
  <span class="vf" :class="{ error: state.vereinsflieger.error }">
    <AppIcon :name="state.vereinsflieger.error ? 'alert' : 'cloud'" :size="15" :stroke="1.9" />
    <span v-if="running">Gleiche mit Vereinsflieger ab …</span>
    <span v-else-if="state.vereinsflieger.error">Abgleich mit Vereinsflieger fehlgeschlagen ({{ state.vereinsflieger.error }}). Stand: {{ fmtWhen(state.vereinsflieger.lastSync) }}</span>
    <span v-else>{{ what }} kommen aus Vereinsflieger · abgeglichen {{ fmtWhen(state.vereinsflieger.lastSync) }}</span>
    <button v-if="can('edit') && !running" type="button" class="link-btn" @click="sync">{{ state.vereinsflieger.error ? 'Erneut versuchen' : 'Jetzt abgleichen' }}</button>
  </span>
</template>

<style scoped>
.vf { display: inline-flex; align-items: center; flex-wrap: wrap; gap: 4px 6px; font-size: 12.5px; color: var(--muted); }
.vf.error { color: var(--orange-ink); font-weight: 600; }
.link-btn { padding: 0; font-size: 12.5px; }
</style>
