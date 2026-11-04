<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import AppIcon from './AppIcon.vue'

const props = defineProps<{ label: string; options: { value: string; label: string }[]; modelValue: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const open = ref(false)
const btn = ref<HTMLElement | null>(null)
const menu = ref<HTMLElement | null>(null)
const pos = ref({ top: 0, left: 0 })
const current = computed(() => props.options.find((o) => o.value === props.modelValue)?.label ?? '')

const pick = (value: string) => { emit('update:modelValue', value); open.value = false }

/** The menu lives in <body> (it must not be clipped by scrolling cards or hidden by the sidebar), so it is placed from the button. */
function place() {
  if (!btn.value || !menu.value) return
  const r = btn.value.getBoundingClientRect()
  const w = menu.value.offsetWidth
  const h = menu.value.offsetHeight
  const vw = document.documentElement.clientWidth
  // Right edges aligned like before, but always inside the viewport.
  const left = Math.min(Math.max(8, r.right - w), vw - w - 8)
  const below = r.bottom + 6
  const top = below + h > window.innerHeight - 8 && r.top - 6 - h >= 8 ? r.top - 6 - h : below
  pos.value = { top, left }
}

const onDoc = (e: MouseEvent) => {
  const t = e.target as Node
  if (!btn.value?.contains(t) && !menu.value?.contains(t)) open.value = false
}
const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { open.value = false; btn.value?.focus() } }
const onMove = () => { open.value = false }

function listen(on: boolean) {
  const m = on ? 'addEventListener' : 'removeEventListener'
  document[m]('click', onDoc as EventListener)
  document[m]('keydown', onKey as EventListener)
  window[m]('resize', onMove)
  window[m]('scroll', onMove, true)
}
watch(open, async (o) => {
  listen(o)
  if (o) { await nextTick(); place() }
})
onBeforeUnmount(() => listen(false))
</script>

<template>
  <button ref="btn" type="button" class="dd-btn" aria-haspopup="listbox" :aria-expanded="open" @click="open = !open">
    {{ props.label }}: {{ current }} <AppIcon name="chevronDown" :size="14" />
  </button>
  <Teleport to="body">
    <div v-if="open" ref="menu" class="dd-menu" role="listbox" :aria-label="props.label" :style="{ top: `${pos.top}px`, left: `${pos.left}px` }">
      <button
        v-for="o in props.options" :key="o.value" type="button" role="option"
        :aria-selected="o.value === props.modelValue" class="dd-item" @click="pick(o.value)"
      >
        {{ o.label }}
        <AppIcon v-if="o.value === props.modelValue" name="check" :size="16" :stroke="2.6" class="dd-check" />
      </button>
    </div>
  </Teleport>
</template>

<style scoped>
.dd-btn {
  height: 40px; padding: 0 12px; border-radius: 10px; border: 1px solid var(--border-strong);
  background: var(--surface); font-size: 13px; font-weight: 500;
  display: inline-flex; align-items: center; gap: 6px; white-space: nowrap;
}
.dd-menu {
  /* above the sidebar (60), below popups (100) */
  position: fixed; z-index: 70; min-width: 200px; max-width: calc(100vw - 16px); max-height: calc(100vh - 16px); overflow-y: auto;
  background: var(--surface); border: 1px solid #D5DCE5; border-radius: 12px; box-shadow: var(--shadow-pop); padding: 6px;
}
.dd-item {
  width: 100%; display: flex; justify-content: space-between; align-items: center; gap: 12px;
  height: 40px; padding: 0 10px; border: 0; border-radius: 8px; background: transparent; font-size: 13.5px; text-align: left;
}
.dd-item:hover { background: var(--subtle); }
.dd-check { color: var(--accent); }
</style>
