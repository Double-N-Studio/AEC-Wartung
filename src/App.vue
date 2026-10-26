<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import AppSidebar from './components/AppSidebar.vue'
import AppIcon from './components/AppIcon.vue'
import { currentUser } from './store'
import logoUrl from './assets/aec-logo.png'

const drawerOpen = ref(false)
const route = useRoute()
watch(() => route.fullPath, () => { drawerOpen.value = false })
</script>

<template>
  <div class="shell">
    <header class="topbar">
      <button type="button" class="icon-btn" aria-label="Menü öffnen" :aria-expanded="drawerOpen" @click="drawerOpen = true">
        <AppIcon name="menu" />
      </button>
      <img :src="logoUrl" alt="Aero-Club Bad Nauheim" class="topbar-logo">
      <span class="topbar-title">Winterwartung</span>
    </header>

    <div class="sidebar-wrap" :class="{ open: drawerOpen }">
      <AppSidebar @navigate="drawerOpen = false" />
    </div>
    <div v-if="drawerOpen" class="backdrop" @click="drawerOpen = false" />

    <main class="content">
      <p v-if="!currentUser()" class="guest-note">
        <AppIcon name="eye" :size="16" />Nicht angemeldet – du kannst alles ansehen, aber nichts ändern.
      </p>
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
.shell { display: flex; height: 100%; }
.topbar { display: none; }
.sidebar-wrap { height: 100%; }
.content { flex: 1; min-width: 0; height: 100%; overflow-y: auto; }
.guest-note {
  display: flex; align-items: center; gap: 8px; padding: 10px 32px;
  background: var(--gray-soft); border-bottom: 1px solid var(--border); font-size: 13px; font-weight: 600; color: var(--text-2);
}

@media (max-width: 900px) {
  .shell { flex-direction: column; }
  .topbar {
    display: flex; align-items: center; gap: 12px; flex-shrink: 0;
    height: 60px; padding: 0 12px; background: var(--surface); border-bottom: 1px solid var(--border);
  }
  .topbar-logo { height: 30px; width: auto; }
  .topbar-title { font-size: 16px; font-weight: 700; }
  .sidebar-wrap {
    position: fixed; top: 0; bottom: 0; left: 0; z-index: 60;
    transform: translateX(-100%); transition: transform 0.2s ease, box-shadow 0.2s ease;
  }
  /* Schatten nur im offenen Zustand, sonst ragt er geschlossen von links ins Bild. */
  .sidebar-wrap.open { transform: translateX(0); box-shadow: var(--shadow-modal); }
  .backdrop { position: fixed; inset: 0; z-index: 50; background: rgba(23, 32, 43, 0.4); }
  .content { height: auto; flex: 1; min-height: 0; }
  .guest-note { padding: 10px 16px; }
}
</style>
