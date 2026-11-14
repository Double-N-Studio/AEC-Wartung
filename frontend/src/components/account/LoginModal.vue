<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { login, needsPassword, session, state } from '../../store'
import { DEMO } from '../../api/backend'
import AppIcon from '../AppIcon.vue'
import AppModal from '../AppModal.vue'
import { authDialog } from './authDialog'

/** Login for special accounts: pick the account by name, then the password. In the demo any password is accepted. */
const accounts = computed(() =>
  state.users.filter((u) => !u.removed && needsPassword(u)).sort((a, b) => a.name.localeCompare(b.name, 'de')))
const form = reactive({ userId: accounts.value.length === 1 ? accounts.value[0]!.id : '', password: '' })
const failed = ref<'' | 'wrong' | 'offline'>('')
const busy = ref(false)

async function submit() {
  if (busy.value || !form.userId) return
  busy.value = true
  try {
    failed.value = (await login(form.userId, form.password)) ? '' : 'wrong'
    if (!failed.value) authDialog.value = null
  } catch {
    failed.value = 'offline'
  }
  busy.value = false
}

/** On the first visit, closing without logging in goes back to the name selection. */
const close = () => { authDialog.value = session.chosen ? null : 'name' }
</script>

<template>
  <AppModal priority title="Anmelden" icon="shield" subtitle="Für Werkstattleitung, Admins und das Werkstatt-Tablet" :width="480" @close="close">
    <form id="login-form" class="form" @submit.prevent="submit">
      <div class="field">
        <label for="lg-user">Konto</label>
        <select id="lg-user" v-model="form.userId" class="select" required @change="failed = ''">
          <option value="" disabled>Bitte auswählen</option>
          <option v-for="u in accounts" :key="u.id" :value="u.id">{{ u.name }}</option>
        </select>
      </div>
      <div class="field">
        <label for="lg-pw">Passwort</label>
        <input id="lg-pw" v-model="form.password" type="password" class="input" required autocomplete="current-password" @input="failed = ''">
      </div>
      <p v-if="failed === 'wrong'" class="error">Das Passwort stimmt nicht.</p>
      <p v-else-if="failed === 'offline'" class="error">Keine Verbindung zum Server. Bitte gleich noch einmal versuchen.</p>
      <p class="muted small">Passwort vergessen? Ein Admin kann dir einen neuen Link geben.</p>
    </form>

    <p v-if="DEMO" class="demo muted small">Demo: Das Passwort ist beliebig.</p>

    <template #meta>
      <button type="button" class="link-btn" @click="authDialog = 'name'"><AppIcon name="user" :size="15" />Mitglied? Einfach Namen eingeben</button>
    </template>
    <template #footer>
      <button type="button" class="btn btn-ghost" @click="close">Abbrechen</button>
      <button type="submit" form="login-form" class="btn btn-primary" :disabled="busy">{{ busy ? 'Einen Moment …' : 'Anmelden' }}</button>
    </template>
  </AppModal>
</template>

<style scoped>
.form { display: flex; flex-direction: column; gap: 16px; }
.error { font-size: 13px; font-weight: 600; color: var(--red-ink); }
.small { font-size: 12.5px; }
.demo { margin: 16px 0 0; padding: 10px 14px; border-radius: 12px; background: var(--subtle); border: 1px dashed var(--border-strong); }
</style>
