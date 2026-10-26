<script setup lang="ts">
import AppModal from './AppModal.vue'

/** Rückfrage vor Aktionen, die sich nicht rückgängig machen lassen (z. B. Löschen). */
const props = withDefaults(defineProps<{ title: string; text: string; confirm?: string; icon?: string }>(), { confirm: 'Löschen', icon: 'trash' })
const emit = defineEmits<{ confirm: []; close: [] }>()
</script>

<template>
  <AppModal :title="props.title" :icon="props.icon" :width="460" @close="emit('close')">
    <p class="text">{{ props.text }}</p>
    <template #footer>
      <button type="button" class="btn btn-ghost" @click="emit('close')">Abbrechen</button>
      <button type="button" class="btn btn-danger" @click="emit('confirm')">{{ props.confirm }}</button>
    </template>
  </AppModal>
</template>

<style scoped>
.text { font-size: 15px; line-height: 1.55; }
</style>
