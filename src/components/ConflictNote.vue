<script setup lang="ts">
import AppIcon from './AppIcon.vue'

/** Hinweis im Formular, wenn der Datensatz währenddessen auf einem anderen Gerät geändert wurde. */
defineProps<{ who: string }>()
const emit = defineEmits<{ reload: [] }>()
</script>

<template>
  <div class="conflict" role="alert">
    <AppIcon name="alert" :size="18" />
    <span class="text">
      <strong>{{ who }} hat das gerade auf einem anderen Gerät geändert.</strong>
      Wenn du jetzt speicherst, überschreibst du diese Änderung.
    </span>
    <button type="button" class="btn btn-sm" @click="emit('reload')">Neuen Stand laden</button>
  </div>
</template>

<style scoped>
.conflict {
  display: flex; align-items: center; gap: 12px; flex-wrap: wrap; padding: 12px 14px; border-radius: 12px;
  background: var(--warn-soft); color: var(--orange-ink); font-size: 13.5px; line-height: 1.45;
}
.text { flex: 1; min-width: 200px; }
.text strong { display: block; }
</style>
