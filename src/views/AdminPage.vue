<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { can, createUser, currentUser, removeUser, setSeason, state, updateUser } from '../store'
import type { Role, User } from '../types'
import { ROLE_LABELS } from '../mock/people'
import { fmtDate, parse } from '../utils/date'
import AppIcon from '../components/AppIcon.vue'
import AppModal from '../components/AppModal.vue'
import ConfirmModal from '../components/ConfirmModal.vue'
import PersonAvatar from '../components/PersonAvatar.vue'

const ROLES: Role[] = ['admin', 'wl', 'user']
const ROLE_TEXT: Record<Role, string> = {
  admin: 'Alle Rechte, auch Konten, Saison und Werkstattzeiträume.',
  wl: 'Abzeichnen, Werkstatttage planen. Vorerst dieselben Rechte wie Admin.',
  user: 'Karten bearbeiten, Mängel erfassen, zählen und bestellen.',
}

const accounts = computed(() => state.users.filter((u) => !u.removed))

/* ---------- Konto anlegen / bearbeiten ---------- */
const editing = ref<User | 'new' | null>(null)
const form = reactive({ name: '', role: 'user' as Role })
function openUser(u: User | 'new') {
  Object.assign(form, u === 'new' ? { name: '', role: 'user' } : { name: u.name, role: u.role })
  editing.value = u
}
function saveUser() {
  if (!form.name.trim()) return
  if (editing.value === 'new') createUser(form.name, form.role)
  else if (editing.value) updateUser(editing.value, form.name, form.role)
  editing.value = null
}
const editingSelf = computed(() => editing.value !== 'new' && editing.value?.id === currentUser()?.id)
const removing = ref<User | null>(null)
function confirmRemove() {
  if (removing.value) removeUser(removing.value)
  removing.value = null
  editing.value = null
}

/* ---------- Saison ---------- */
const seasonOpen = ref(false)
const season = reactive({ label: '', start: '', end: '' })
function openSeason() {
  Object.assign(season, state.season)
  seasonOpen.value = true
}
const isSat = (iso: string) => !!iso && parse(iso).getDay() === 6
const seasonError = computed(() => {
  if (!isSat(season.start) || !isSat(season.end)) return 'Beginn und Ende müssen Samstage sein.'
  if (season.end < season.start) return 'Das Ende liegt vor dem Beginn.'
  return ''
})
function saveSeason() {
  if (seasonError.value || !season.label.trim()) return
  setSeason(season)
  seasonOpen.value = false
}
</script>

<template>
  <div class="page">
    <header>
      <h1 class="page-title">Verwaltung</h1>
      <p class="page-sub">Konten und Saison. Die Werkstattzeiträume der Flugzeuge änderst du im Zeitplan über den Stift.</p>
    </header>

    <p v-if="!can('admin')" class="card denied">Dieser Bereich ist nur für Admins.</p>

    <template v-else>
      <section class="card box" aria-labelledby="season-h">
        <div class="box-head">
          <h2 id="season-h" class="section-title">Saison</h2>
          <button type="button" class="btn btn-sm" @click="openSeason"><AppIcon name="pen" :size="15" />Bearbeiten</button>
        </div>
        <dl class="facts">
          <dt>Bezeichnung</dt><dd>{{ state.season.label }}</dd>
          <dt>Erster Werkstatttag</dt><dd>Sa {{ fmtDate(state.season.start) }}</dd>
          <dt>Letzter Werkstatttag</dt><dd>Sa {{ fmtDate(state.season.end) }}</dd>
        </dl>
      </section>

      <section class="card list" aria-labelledby="users-h">
        <div class="box-head pad">
          <h2 id="users-h" class="section-title">Konten <span class="count">{{ accounts.length }}</span></h2>
          <button type="button" class="btn btn-sm" @click="openUser('new')"><AppIcon name="plus" :size="16" :stroke="2.2" />Konto anlegen</button>
        </div>
        <ul class="rows">
          <li v-for="u in accounts" :key="u.id">
            <button type="button" class="row" @click="openUser(u)">
              <span v-if="u.device" class="device"><AppIcon name="tablet" :size="18" /></span>
              <PersonAvatar v-else :person="u.id" :size="36" />
              <span class="who">
                <strong>{{ u.name }}<span v-if="u.id === currentUser()?.id" class="pill pill-gray">Du</span></strong>
                <span class="muted">{{ u.device ? 'Gerät, z. B. in der Werkstatt' : 'Person' }}</span>
              </span>
              <span class="pill" :class="u.role === 'user' ? 'pill-gray' : 'pill-accent-soft'">{{ ROLE_LABELS[u.role] }}</span>
              <AppIcon name="chevronRight" :size="16" class="muted" />
            </button>
          </li>
        </ul>
      </section>
    </template>

    <AppModal
      v-if="editing" :title="editing === 'new' ? 'Konto anlegen' : editing.name" icon="user" :width="520"
      :subtitle="editing === 'new' ? 'Neues Konto' : editing.device ? 'Gerät' : 'Konto'" @close="editing = null"
    >
      <template v-if="editing !== 'new' && !editingSelf" #tools>
        <button type="button" class="tool" aria-label="Konto entfernen" title="Konto entfernen" @click="removing = editing"><AppIcon name="trash" :size="19" /></button>
      </template>
      <form id="user-form" class="form" @submit.prevent="saveUser">
        <div class="field">
          <label for="uf-name">Name</label>
          <input id="uf-name" v-model="form.name" class="input" required placeholder="z. B. Max">
        </div>
        <div class="field">
          <span class="field-label">Rolle</span>
          <div class="roles" role="radiogroup" aria-label="Rolle">
            <label v-for="r in ROLES" :key="r" class="role" :class="{ active: form.role === r }">
              <input v-model="form.role" type="radio" name="role" :value="r" :disabled="editingSelf">
              <span><strong>{{ ROLE_LABELS[r] }}</strong><span class="muted">{{ ROLE_TEXT[r] }}</span></span>
            </label>
          </div>
          <span v-if="editingSelf" class="muted small">Die eigene Rolle kann nur ein anderer Admin ändern.</span>
        </div>
      </form>
      <template #footer>
        <button type="button" class="btn btn-ghost" @click="editing = null">Abbrechen</button>
        <button type="submit" form="user-form" class="btn btn-primary">{{ editing === 'new' ? 'Anlegen' : 'Speichern' }}</button>
      </template>
    </AppModal>

    <ConfirmModal
      v-if="removing" title="Konto entfernen?" confirm="Entfernen"
      :text="`${removing.name} kann sich danach nicht mehr anmelden. Einträge im Verlauf bleiben mit dem Namen erhalten; als Werkstattleitung eingetragene Tage werden wieder offen.`"
      @confirm="confirmRemove" @close="removing = null"
    />

    <AppModal v-if="seasonOpen" title="Saison bearbeiten" icon="calendar" :width="520" @close="seasonOpen = false">
      <form id="season-form" class="form" @submit.prevent="saveSeason">
        <div class="field">
          <label for="sf-label">Bezeichnung</label>
          <input id="sf-label" v-model="season.label" class="input" required placeholder="z. B. 2027/28">
        </div>
        <div class="two">
          <div class="field">
            <label for="sf-start">Erster Werkstatttag</label>
            <input id="sf-start" v-model="season.start" type="date" class="input" required>
          </div>
          <div class="field">
            <label for="sf-end">Letzter Werkstatttag</label>
            <input id="sf-end" v-model="season.end" type="date" class="input" required>
          </div>
        </div>
        <p v-if="seasonError" class="error">{{ seasonError }}</p>
      </form>
      <template #meta>Bestimmt den Saisonplan und die Monate im Kalender.</template>
      <template #footer>
        <button type="button" class="btn btn-ghost" @click="seasonOpen = false">Abbrechen</button>
        <button type="submit" form="season-form" class="btn btn-primary" :disabled="!!seasonError">Speichern</button>
      </template>
    </AppModal>
  </div>
</template>

<style scoped>
.denied { padding: 24px; font-size: 14px; color: var(--text-2); }
.box { padding: 18px 20px; display: flex; flex-direction: column; gap: 14px; }
.box-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.box-head.pad { padding: 14px 16px; border-bottom: 1px solid var(--border); }
.section-title { display: flex; align-items: center; gap: 8px; }
.section-title .count { background: var(--gray-soft); }
.facts { display: grid; grid-template-columns: 180px minmax(0, 1fr); row-gap: 8px; column-gap: 16px; margin: 0; font-size: 14px; }
.facts dt { color: var(--muted); }
.facts dd { margin: 0; font-weight: 600; }
.rows { list-style: none; margin: 0; padding: 0; }
.row {
  width: 100%; display: flex; align-items: center; gap: 12px; min-height: 60px; padding: 10px 16px;
  border: 0; border-bottom: 1px solid var(--border-soft); background: transparent; text-align: left;
}
.rows li:last-child .row { border-bottom: 0; }
.row:hover { background: var(--subtle); }
.device {
  width: 36px; height: 36px; border-radius: 10px; flex-shrink: 0;
  display: inline-flex; align-items: center; justify-content: center; background: var(--accent-soft); color: var(--accent-ink);
}
.who { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.who strong { display: flex; align-items: center; gap: 8px; font-size: 14.5px; }
.who .muted { font-size: 12.5px; }
.pill-accent-soft { background: var(--accent-soft); color: var(--accent-ink); }
.form { display: flex; flex-direction: column; gap: 16px; }
.roles { display: flex; flex-direction: column; gap: 8px; }
.role {
  display: flex; align-items: flex-start; gap: 12px; padding: 12px 14px; border-radius: 12px;
  border: 1.5px solid var(--border-strong); cursor: pointer; font-size: 14px;
}
.role.active { border-color: var(--accent); background: var(--accent-tint); }
.role input { width: 18px; height: 18px; margin: 2px 0 0; accent-color: var(--accent); }
.role > span { display: flex; flex-direction: column; gap: 2px; }
.role .muted { font-size: 12.5px; line-height: 1.4; }
.two { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.small { font-size: 12.5px; }
.error { font-size: 13px; font-weight: 600; color: var(--red-ink); }
@media (max-width: 640px) {
  .facts { grid-template-columns: 1fr; row-gap: 2px; }
  .facts dd { margin-bottom: 8px; }
  .two { grid-template-columns: 1fr; }
}
</style>
