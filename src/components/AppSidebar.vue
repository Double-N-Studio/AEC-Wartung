<script setup lang="ts">
import { useRoute } from 'vue-router'
import { activeAircraft, can, currentUser, resetDemo, state } from '../store'
import AccountMenu from './account/AccountMenu.vue'
import SyncStatus from './SyncStatus.vue'
import { setSimulateOffline, sync } from '../sync'
import AppIcon from './AppIcon.vue'
import logoUrl from '../assets/aec-logo.png'

const emit = defineEmits<{ navigate: [] }>()
const route = useRoute()
const isAircraftActive = (id: string) => route.path.startsWith(`/flugzeug/${id}`)

function onReset() {
  if (window.confirm('Alle Änderungen der Demo verwerfen und mit den Ausgangsdaten neu starten?')) resetDemo()
}
</script>

<template>
  <nav class="sidebar" aria-label="Hauptnavigation">
    <div class="brand">
      <img :src="logoUrl" alt="Aero-Club Bad Nauheim" class="logo">
      <span class="brand-sub">Winterwartung · Saison {{ state.season.label }}</span>
    </div>

    <div class="group">
      <RouterLink to="/" class="nav-item" exact-active-class="active" @click="emit('navigate')">
        <AppIcon name="calendar" :size="20" :stroke="1.8" /> Zeitplan
      </RouterLink>
      <RouterLink to="/inventur" class="nav-item" active-class="active" @click="emit('navigate')">
        <AppIcon name="box" :size="20" :stroke="1.8" /> Inventur
      </RouterLink>
      <RouterLink v-if="currentUser() && !currentUser()!.device" to="/meine-sachen" class="nav-item" active-class="active" @click="emit('navigate')">
        <AppIcon name="user" :size="20" :stroke="1.8" /> Meine Sachen
      </RouterLink>
    </div>

    <div class="group">
      <span class="group-label">FLUGZEUGE</span>
      <RouterLink
        v-for="a in activeAircraft()" :key="a.id" :to="`/flugzeug/${a.id}`" class="nav-plane"
        :class="{ active: isAircraftActive(a.id) }" @click="emit('navigate')"
      >
        <strong>{{ a.type }}</strong><span>{{ a.reg }}</span>
      </RouterLink>
      <span v-if="!activeAircraft().length" class="nav-empty">Noch keine Flugzeuge</span>
    </div>

    <div class="spacer" />

    <div class="group bottom">
      <RouterLink v-if="can('admin')" to="/verwaltung" class="nav-item" active-class="active" @click="emit('navigate')">
        <AppIcon name="settings" :size="20" :stroke="1.8" /> Verwaltung
      </RouterLink>
      <RouterLink to="/faq" class="nav-item" active-class="active" @click="emit('navigate')">
        <AppIcon name="help" :size="20" :stroke="1.8" /> FAQ
      </RouterLink>
    </div>
    <SyncStatus class="sync-line" />
    <AccountMenu />
    <div class="demo">
      <button type="button" class="reset" @click="onReset"><AppIcon name="refresh" :size="14" /> Demo zurücksetzen</button>
      <button type="button" class="reset" :aria-pressed="sync.simulateOffline" @click="setSimulateOffline(!sync.simulateOffline)">
        <AppIcon name="cloud" :size="14" /> {{ sync.simulateOffline ? 'Wieder online' : 'Offline testen' }}
      </button>
    </div>
  </nav>
</template>

<style scoped>
.sidebar {
  width: 248px; height: 100%; flex-shrink: 0; overflow-y: auto;
  background: var(--surface); border-right: 1px solid var(--border);
  padding: 20px 14px 14px; display: flex; flex-direction: column; gap: 22px;
}
.brand { display: flex; flex-direction: column; gap: 8px; padding: 2px 8px; }
.logo { display: block; width: 110px; height: auto; margin: 0 auto; }
.brand-sub { font-size: 13px; font-weight: 600; color: var(--text-2); }
.group { display: flex; flex-direction: column; gap: 2px; }
.group-label { padding: 0 12px 6px; font-size: 11px; font-weight: 600; letter-spacing: 0.08em; color: var(--muted); }
.nav-item {
  display: flex; align-items: center; gap: 12px; height: 44px; padding: 0 12px; border-radius: 10px;
  font-size: 15px; font-weight: 500; color: var(--text-2); text-decoration: none;
}
.nav-item:hover, .nav-plane:hover { background: var(--subtle); color: var(--text); }
.nav-item.active, .nav-plane.active { background: var(--accent-soft); color: var(--accent-ink); font-weight: 600; }
.nav-plane {
  display: flex; align-items: center; gap: 10px; height: 40px; padding: 0 12px; border-radius: 10px;
  font-size: 14px; color: var(--text); text-decoration: none;
}
.nav-plane strong { font-weight: 600; }
.nav-plane span { font-size: 13px; color: var(--muted); }
.nav-plane.active span { color: inherit; }
.nav-empty { padding: 0 12px; font-size: 13px; color: var(--muted); }
.spacer { flex-grow: 1; }
.bottom { margin-bottom: -12px; }
.sync-line { margin: -10px 12px -12px; }
.demo { margin-top: -12px; display: flex; justify-content: center; flex-wrap: wrap; gap: 0 4px; }
.reset {
  align-self: center; display: inline-flex; align-items: center; gap: 6px;
  height: 32px; padding: 0 10px; border: 0; background: transparent; font-size: 12px; color: var(--muted);
}
.reset:hover { color: var(--text); }
</style>
