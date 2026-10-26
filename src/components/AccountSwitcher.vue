<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { currentUser, session, state, switchUser } from '../store'
import type { User, UserId } from '../types'
import { ROLE_LABELS } from '../mock/people'
import AppIcon from './AppIcon.vue'
import PersonAvatar from './PersonAvatar.vue'

/** Konto unten in der Seitenleiste. Im Mockup lässt sich das Testkonto frei wechseln (statt Login). */
const open = ref(false)
const root = ref<HTMLElement | null>(null)
const me = computed(() => currentUser())
const accounts = computed(() => state.users.filter((u) => !u.removed))

function pick(id: UserId | null) {
  switchUser(id)
  open.value = false
}
const roleText = (u: User) => (u.device ? `Gerät · ${ROLE_LABELS[u.role]}` : ROLE_LABELS[u.role])

const onDoc = (e: MouseEvent) => { if (root.value && !root.value.contains(e.target as Node)) open.value = false }
const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') open.value = false }
onMounted(() => {
  document.addEventListener('click', onDoc)
  document.addEventListener('keydown', onKey)
})
onBeforeUnmount(() => {
  document.removeEventListener('click', onDoc)
  document.removeEventListener('keydown', onKey)
})
</script>

<template>
  <div ref="root" class="account">
    <div v-if="open" class="menu" role="listbox" aria-label="Testkonto wechseln">
      <span class="menu-label">Testkonto wechseln</span>
      <button type="button" role="option" class="option" :aria-selected="!me" @click="pick(null)">
        <span class="icon guest"><AppIcon name="eye" :size="16" /></span>
        <span class="text"><strong>Nicht angemeldet</strong><span>Nur lesen</span></span>
        <AppIcon v-if="!me" name="check" :size="16" :stroke="2.6" class="check" />
      </button>
      <button
        v-for="u in accounts" :key="u.id" type="button" role="option" class="option"
        :aria-selected="session.userId === u.id" @click="pick(u.id)"
      >
        <span v-if="u.device" class="icon"><AppIcon name="tablet" :size="16" /></span>
        <PersonAvatar v-else :person="u.id" :size="30" />
        <span class="text"><strong>{{ u.name }}</strong><span>{{ roleText(u) }}</span></span>
        <AppIcon v-if="session.userId === u.id" name="check" :size="16" :stroke="2.6" class="check" />
      </button>
    </div>

    <button type="button" class="current" :aria-expanded="open" aria-label="Testkonto wechseln" @click="open = !open">
      <span v-if="!me" class="icon big guest"><AppIcon name="eye" :size="20" :stroke="1.8" /></span>
      <span v-else-if="me.device" class="icon big"><AppIcon name="tablet" :size="20" :stroke="1.8" /></span>
      <PersonAvatar v-else :person="me.id" :size="36" />
      <span class="text">
        <strong>{{ me?.name ?? 'Nicht angemeldet' }}</strong>
        <span>{{ me ? ROLE_LABELS[me.role] : 'Nur lesen' }}</span>
      </span>
      <AppIcon name="swap" :size="16" class="swap" />
    </button>
  </div>
</template>

<style scoped>
.account { position: relative; }
.current {
  width: 100%; display: flex; align-items: center; gap: 12px; padding: 12px; border: 0; border-radius: 12px;
  background: var(--bg); text-align: left;
}
.current:hover { background: var(--column); }
.icon {
  width: 30px; height: 30px; border-radius: 9px; flex-shrink: 0;
  display: inline-flex; align-items: center; justify-content: center; background: var(--accent-soft); color: var(--accent-ink);
}
.icon.big { width: 36px; height: 36px; border-radius: 10px; }
.icon.guest { background: var(--gray-soft); color: var(--text-2); }
.text { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
.text strong { font-size: 14px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.text span { font-size: 12px; color: var(--muted); }
.current .text strong { white-space: normal; }
.swap { color: var(--muted); flex-shrink: 0; }
.menu {
  position: absolute; left: 0; right: 0; bottom: calc(100% + 6px); z-index: 30;
  max-height: 70vh; overflow-y: auto; padding: 6px;
  background: var(--surface); border: 1px solid var(--border-strong); border-radius: 12px; box-shadow: var(--shadow-pop);
}
.menu-label { display: block; padding: 6px 8px 8px; font-size: 11px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: var(--muted); }
.option {
  width: 100%; display: flex; align-items: center; gap: 10px; min-height: 46px; padding: 6px 8px;
  border: 0; border-radius: 8px; background: transparent; text-align: left;
}
.option:hover { background: var(--subtle); }
.option[aria-selected='true'] { background: var(--accent-tint); }
.option .text strong { font-size: 13.5px; }
.check { color: var(--accent); flex-shrink: 0; }
</style>
