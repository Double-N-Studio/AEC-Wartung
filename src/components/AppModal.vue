<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'
import AppIcon from './AppIcon.vue'

/**
 * Gemeinsames Popup aller Seiten.
 * Kopf: Typ-Symbol, Titel, Untertitel, Status-Chips (#status), Werkzeuge wie Bearbeiten/Löschen (#tools).
 * Fuß: Info links (#meta), Aktionen rechts (#footer).
 */
const props = withDefaults(defineProps<{ title: string; icon: string; subtitle?: string; width?: number }>(), { width: 640 })
const emit = defineEmits<{ close: [] }>()

// Escape schließt nur das oberste Popup, z. B. die Rückfrage vor dem Löschen.
const token = Symbol('modal')
const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && openModals[openModals.length - 1] === token) emit('close') }
onMounted(() => {
  openModals.push(token)
  document.addEventListener('keydown', onKey)
})
onBeforeUnmount(() => {
  openModals.splice(openModals.indexOf(token), 1)
  document.removeEventListener('keydown', onKey)
})
</script>

<script lang="ts">
const openModals: symbol[] = []
</script>

<template>
  <Teleport to="body">
    <div class="overlay" @click.self="emit('close')">
      <div class="modal" role="dialog" aria-modal="true" :aria-label="props.title" :style="{ maxWidth: `${props.width}px` }">
        <header class="modal-head">
          <span class="modal-icon"><AppIcon :name="props.icon" :size="24" :stroke="1.9" /></span>
          <div class="modal-titles">
            <h2 class="modal-title">{{ props.title }}</h2>
            <p v-if="props.subtitle" class="modal-sub">{{ props.subtitle }}</p>
          </div>
          <div v-if="$slots.status" class="modal-status"><slot name="status" /></div>
          <div class="modal-tools">
            <slot name="tools" />
            <button type="button" class="modal-close" aria-label="Schließen" @click="emit('close')"><AppIcon name="x" :size="20" /></button>
          </div>
        </header>
        <div class="modal-body"><slot /></div>
        <footer v-if="$slots.footer || $slots.meta" class="modal-foot">
          <div v-if="$slots.meta" class="modal-meta"><slot name="meta" /></div>
          <div class="modal-actions"><slot name="footer" /></div>
        </footer>
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
  width: 100%; max-height: calc(100vh - 48px); overflow: hidden;
  background: var(--surface); border-radius: 16px; box-shadow: var(--shadow-modal);
  display: flex; flex-direction: column;
}
.modal-head {
  flex-shrink: 0; display: grid; grid-template-columns: auto minmax(0, 1fr) auto auto; align-items: center; column-gap: 14px; row-gap: 10px;
  padding: 20px 20px 20px 24px; background: var(--accent-tint); border-bottom: 1px solid var(--accent-soft);
}
.modal-icon {
  width: 48px; height: 48px; border-radius: 12px; background: var(--accent-soft); color: var(--accent-ink);
  display: flex; align-items: center; justify-content: center;
}
.modal-titles { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.modal-title { font-size: 19px; font-weight: 700; letter-spacing: -0.01em; line-height: 1.3; }
.modal-sub { font-size: 13px; color: var(--text-2); }
.modal-status { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; justify-content: flex-end; }
.modal-tools { display: flex; align-items: center; gap: 2px; }
.modal-close, .modal-tools :deep(.tool) {
  width: 40px; height: 40px; border: 0; border-radius: 10px; background: transparent; color: var(--text-2);
  display: inline-flex; align-items: center; justify-content: center;
}
.modal-close:hover, .modal-tools :deep(.tool:hover) { background: var(--accent-soft); color: var(--accent-ink); }
.modal-body { flex: 1; min-height: 0; overflow-y: auto; padding: 20px 24px; display: flex; flex-direction: column; gap: 18px; }
.modal-foot {
  flex-shrink: 0; display: flex; align-items: center; justify-content: space-between; gap: 10px 16px; flex-wrap: wrap;
  padding: 14px 24px 20px; border-top: 1px solid var(--border-soft);
}
.modal-meta { display: flex; align-items: center; gap: 6px; font-size: 12.5px; color: var(--muted); }
.modal-actions { margin-left: auto; display: flex; align-items: center; gap: 10px; flex-wrap: wrap; justify-content: flex-end; }
@media (max-width: 640px) {
  .overlay { padding: 0; align-items: flex-end; }
  .modal { max-height: 92vh; border-radius: 18px 18px 0 0; }
  .modal-head { padding: 16px 12px 16px 16px; column-gap: 12px; }
  .modal-icon { width: 40px; height: 40px; border-radius: 10px; }
  .modal-title { font-size: 17px; }
  .modal-status { grid-column: 2 / 4; grid-row: 2; justify-content: flex-start; }
  .modal-body { padding: 16px; }
  .modal-foot { padding: 12px 16px 16px; }
  .modal-actions { width: 100%; }
  .modal-actions > :deep(.btn) { flex: 1; }
}
</style>
