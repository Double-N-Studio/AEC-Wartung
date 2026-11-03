<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { currentUser, logout, needsPassword } from '../../store'
import { ROLE_LABELS } from '../../mock/people'
import AppIcon from '../AppIcon.vue'
import PersonAvatar from '../PersonAvatar.vue'
import { authDialog } from './authDialog'

/** Konto unten in der Seitenleiste: Namen eingeben, anmelden oder abmelden. */
const open = ref(false)
const root = ref<HTMLElement | null>(null)
const me = computed(() => currentUser())
const special = computed(() => !!me.value && needsPassword(me.value))
const subline = computed(() => {
  if (!me.value) return 'Nur ansehen'
  if (me.value.device) return 'Gerät · angemeldet'
  return special.value ? `${ROLE_LABELS[me.value.role]} · angemeldet` : 'Mitglied'
})

function show(dialog: 'name' | 'login') {
  open.value = false
  authDialog.value = dialog
}
function signOut() {
  open.value = false
  logout()
}

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
    <div v-if="open" class="menu" role="menu" aria-label="Konto">
      <button v-if="!special" type="button" role="menuitem" class="option" @click="show('name')">
        <span class="icon"><AppIcon name="user" :size="16" /></span>
        <span class="text"><strong>{{ me ? 'Name ändern' : 'Namen eingeben' }}</strong><span>Ohne Passwort, für Mitglieder</span></span>
      </button>
      <button v-if="!me" type="button" role="menuitem" class="option" @click="show('login')">
        <span class="icon"><AppIcon name="shield" :size="16" /></span>
        <span class="text"><strong>Anmelden</strong><span>Werkstattleitung, Admin, Tablet</span></span>
      </button>
      <button v-if="me" type="button" role="menuitem" class="option" @click="signOut">
        <span class="icon guest"><AppIcon name="eye" :size="16" /></span>
        <span class="text"><strong>Abmelden</strong><span>Danach nur ansehen</span></span>
      </button>
    </div>

    <button type="button" class="current" :aria-expanded="open" aria-haspopup="menu" aria-label="Konto" @click="open = !open">
      <span v-if="!me" class="icon big guest"><AppIcon name="eye" :size="20" :stroke="1.8" /></span>
      <span v-else-if="me.device" class="icon big"><AppIcon name="tablet" :size="20" :stroke="1.8" /></span>
      <PersonAvatar v-else :person="me.id" :size="36" />
      <span class="text">
        <strong>{{ me?.name ?? 'Nicht eingetragen' }}</strong>
        <span>{{ subline }}</span>
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
.option {
  width: 100%; display: flex; align-items: center; gap: 10px; min-height: 46px; padding: 6px 8px;
  border: 0; border-radius: 8px; background: transparent; text-align: left;
}
.option:hover { background: var(--subtle); }
.option .text strong { font-size: 13.5px; }
</style>
