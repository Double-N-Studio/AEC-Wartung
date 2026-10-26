<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'
import AppIcon from './AppIcon.vue'

const props = withDefaults(defineProps<{ title: string; kicker?: string; width?: number }>(), { width: 640 })
const emit = defineEmits<{ close: [] }>()

const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') emit('close') }
onMounted(() => document.addEventListener('keydown', onKey))
onBeforeUnmount(() => document.removeEventListener('keydown', onKey))
</script>

<template>
  <Teleport to="body">
    <div class="overlay" @click.self="emit('close')">
      <div class="modal" role="dialog" aria-modal="true" :aria-label="props.title" :style="{ maxWidth: `${props.width}px` }">
        <header class="modal-head">
          <div class="modal-titles">
            <div v-if="props.kicker || $slots.kicker" class="modal-kicker"><slot name="kicker">{{ props.kicker }}</slot></div>
            <h2 class="modal-title">{{ props.title }}</h2>
          </div>
          <button type="button" class="icon-btn" aria-label="Schließen" @click="emit('close')"><AppIcon name="x" /></button>
        </header>
        <div class="modal-body"><slot /></div>
        <footer v-if="$slots.footer" class="modal-foot"><slot name="footer" /></footer>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.overlay {
  position: fixed; inset: 0; z-index: 100; background: rgba(23, 32, 43, 0.45);
  display: flex; align-items: center; justify-content: center; padding: 24px;
}
.modal {
  width: 100%; max-height: calc(100vh - 48px); overflow-y: auto;
  background: var(--surface); border-radius: 18px; box-shadow: var(--shadow-modal);
  padding: 24px; display: flex; flex-direction: column; gap: 20px;
}
.modal-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.modal-titles { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.modal-kicker { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; font-size: 13px; font-weight: 600; color: var(--muted); }
.modal-title { font-size: 23px; font-weight: 700; letter-spacing: -0.01em; }
.modal-foot { display: flex; justify-content: flex-end; gap: 10px; flex-wrap: wrap; }
@media (max-width: 640px) {
  .overlay { padding: 0; align-items: flex-end; }
  .modal { max-height: 92vh; border-radius: 18px 18px 0 0; padding: 18px; }
  .modal-title { font-size: 20px; }
}
</style>
