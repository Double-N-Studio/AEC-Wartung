<script setup lang="ts">
import { dismiss, toasts } from '../notify'
import AppIcon from './AppIcon.vue'
</script>

<template>
  <Teleport to="body">
    <div class="toasts" role="status" aria-live="polite">
      <div v-for="t in toasts" :key="t.id" class="toast" :class="t.kind">
        <AppIcon :name="t.kind === 'error' ? 'alert' : 'check'" :size="17" :stroke="2" class="icon" />
        <span class="text">{{ t.text }}</span>
        <button type="button" class="close" aria-label="Schließen" @click="dismiss(t.id)"><AppIcon name="x" :size="14" :stroke="2.4" /></button>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.toasts {
  position: fixed; left: 50%; bottom: 20px; transform: translateX(-50%); z-index: 200;
  display: flex; flex-direction: column; gap: 8px; width: min(520px, calc(100vw - 32px)); pointer-events: none;
}
.toast {
  pointer-events: auto; display: flex; align-items: flex-start; gap: 10px; padding: 12px 12px 12px 14px;
  border-radius: 12px; background: var(--surface); border: 1px solid var(--border); box-shadow: var(--shadow-modal);
  font-size: 13.5px; font-weight: 600; line-height: 1.45; color: var(--text);
}
.toast.error { border-color: var(--red-soft); }
.toast.error .icon { color: var(--red-ink); }
.toast.info .icon { color: var(--green-ink); }
.icon { flex-shrink: 0; margin-top: 1px; }
.text { flex: 1; }
.close { flex-shrink: 0; border: 0; background: transparent; color: var(--muted); padding: 2px; display: inline-flex; }
</style>
