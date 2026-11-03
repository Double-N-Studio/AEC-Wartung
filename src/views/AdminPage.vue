<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { can, createUser, currentUser, needsPassword, removeUser, sendPasswordLink, state, updateUser } from '../store'
import { notify } from '../notify'
import type { Role, User } from '../types'
import { ROLE_LABELS } from '../mock/people'
import AppIcon from '../components/AppIcon.vue'
import AppModal from '../components/AppModal.vue'
import ConfirmModal from '../components/ConfirmModal.vue'
import PersonAvatar from '../components/PersonAvatar.vue'
import AircraftSection from './admin/AircraftSection.vue'
import SeasonSection from './admin/SeasonSection.vue'
import VereinsfliegerStatus from '../components/VereinsfliegerStatus.vue'

const ROLES: Role[] = ['admin', 'wl', 'user']
const ROLE_TEXT: Record<Role, string> = {
  admin: 'Alles wie Werkstattleiter, dazu die Verwaltung: Konten, Saison, Flugzeuge, Kanban-Vorlagen und Werkstattzeiträume. Meldet sich mit Passwort an.',
  wl: 'Abzeichnen und Werkstatttage planen; auf den Flugzeugseiten dieselben Rechte wie Admins. Keine Verwaltung. Meldet sich mit Passwort an.',
  user: 'Karten bearbeiten, Mängel erfassen, zählen und bestellen. Gibt nur den Namen ein, kein Passwort.',
}

const accounts = computed(() => state.users.filter((u) => !u.removed))

/* ---------- Konto anlegen / bearbeiten ---------- */
const editing = ref<User | 'new' | null>(null)
const form = reactive({ name: '', role: 'user' as Role, email: '' })
function openUser(u: User | 'new') {
  Object.assign(form, u === 'new' ? { name: '', role: 'user', email: '' } : { name: u.name, role: u.role, email: u.email ?? '' })
  editing.value = u
}
// Werkstattleitung, Admins und Geräte melden sich mit E-Mail und Passwort an.
const withLogin = computed(() => form.role !== 'user' || (editing.value !== 'new' && !!editing.value?.device))
function saveUser() {
  if (!form.name.trim() || (withLogin.value && !form.email.trim())) return
  if (editing.value === 'new') createUser(form.name, form.role, form.email)
  else if (editing.value) updateUser(editing.value, form.name, form.role, form.email)
  editing.value = null
}
const editingSelf = computed(() => editing.value !== 'new' && editing.value?.id === currentUser()?.id)
const linkSending = ref(false)
async function sendLink(u: User) {
  linkSending.value = true
  try {
    await sendPasswordLink(u)
    notify(`Link zum Passwort-Setzen an ${u.email} geschickt.`, 'info')
  } catch {
    notify('Link konnte nicht gesendet werden. Bitte später erneut versuchen.')
  }
  linkSending.value = false
}
const removing = ref<User | null>(null)
function confirmRemove() {
  if (removing.value) removeUser(removing.value)
  removing.value = null
  editing.value = null
}

</script>

<template>
  <div class="page">
    <header>
      <h1 class="page-title">Verwaltung</h1>
      <p class="page-sub">Saison, Kanban-Vorlagen, Flugzeuge und Konten. Mitglieder tragen sich selbst mit Vor- und Nachnamen ein; Werkstattleitung, Admins und das Tablet melden sich mit Passwort an. Die Werkstattzeiträume der Flugzeuge änderst du im Zeitplan über den Stift.</p>
    </header>

    <p v-if="!can('admin')" class="card denied">Dieser Bereich ist nur für Admins.</p>

    <template v-else>
      <SeasonSection />

      <AircraftSection />

      <section class="card box" aria-labelledby="vf-h">
        <h2 id="vf-h" class="section-title">Vereinsflieger</h2>
        <p class="muted small">Mängel und Fristen kommen automatisch aus Vereinsflieger. Die Zugangsdaten liegen auf dem Server, nicht in der App. Rückschreiben nach Vereinsflieger folgt später.</p>
        <VereinsfliegerStatus what="Mängel und Fristen" />
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
                <span class="muted">{{ u.device ? 'Gerät, z. B. in der Werkstatt' : 'Person' }} · {{ u.email ?? 'ohne Passwort' }}</span>
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
        <div v-if="withLogin" class="field">
          <label for="uf-email">E-Mail für die Anmeldung</label>
          <input id="uf-email" v-model="form.email" type="email" class="input" required placeholder="name@example.org">
          <span class="muted small">Den Link zum Passwort-Setzen bekommt {{ form.name.trim() || 'die Person' }} per E-Mail.</span>
        </div>
      </form>
      <template v-if="editing !== 'new' && needsPassword(editing) && editing.email" #meta>
        <button type="button" class="link-btn" :disabled="linkSending" @click="sendLink(editing)">
          <AppIcon name="shield" :size="15" />{{ linkSending ? 'Sendet …' : 'Link zum Passwort-Setzen senden' }}
        </button>
      </template>
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

  </div>
</template>

<style scoped>
.denied { padding: 24px; font-size: 14px; color: var(--text-2); }
.box { padding: 18px 20px; display: flex; flex-direction: column; gap: 10px; }
.box-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.box-head.pad { padding: 14px 16px; border-bottom: 1px solid var(--border); }
.section-title { display: flex; align-items: center; gap: 8px; }
.section-title .count { background: var(--gray-soft); }
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
.small { font-size: 12.5px; }
</style>
