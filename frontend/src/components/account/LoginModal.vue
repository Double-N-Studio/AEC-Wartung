<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { login, needsPassword, session, state } from '../../store'
import { DEMO } from '../../api/backend'
import AppIcon from '../AppIcon.vue'
import AppModal from '../AppModal.vue'
import { authDialog } from './authDialog'

/** Login for special accounts. In the demo any password is accepted; the demo accounts fill in the e-mail. */
const form = reactive({ email: '', password: '' })
const failed = ref<'' | 'wrong' | 'offline'>('')
const busy = ref(false)

async function submit() {
  if (busy.value) return
  busy.value = true
  try {
    failed.value = (await login(form.email, form.password)) ? '' : 'wrong'
    if (!failed.value) authDialog.value = null
  } catch {
    failed.value = 'offline'
  }
  busy.value = false
}

const demoAccounts = computed(() => state.users.filter((u) => !u.removed && needsPassword(u) && u.email))
function fill(email: string) {
  form.email = email
  form.password = 'demo'
  failed.value = ''
}

/** On the first visit, closing without logging in goes back to the name selection. */
const close = () => { authDialog.value = session.chosen ? null : 'name' }
</script>

<template>
  <AppModal priority title="Anmelden" icon="shield" subtitle="Für Werkstattleitung, Admins und das Werkstatt-Tablet" :width="480" @close="close">
    <form id="login-form" class="form" @submit.prevent="submit">
      <div class="field">
        <label for="lg-email">E-Mail</label>
        <input id="lg-email" v-model="form.email" type="email" class="input" required autocomplete="username" @input="failed = ''">
      </div>
      <div class="field">
        <label for="lg-pw">Passwort</label>
        <input id="lg-pw" v-model="form.password" type="password" class="input" required autocomplete="current-password" @input="failed = ''">
      </div>
      <p v-if="failed === 'wrong'" class="error">E-Mail oder Passwort stimmt nicht.</p>
      <p v-else-if="failed === 'offline'" class="error">Keine Verbindung zum Server. Bitte gleich noch einmal versuchen.</p>
      <p class="muted small">Passwort vergessen? Ein Admin kann dir einen neuen Link geben.</p>
    </form>

    <div v-if="DEMO" class="demo">
      <span class="field-label">Demo: Konto antippen, Passwort ist beliebig</span>
      <div class="chips">
        <button v-for="u in demoAccounts" :key="u.id" type="button" class="chip" @click="fill(u.email!)">
          <AppIcon v-if="u.device" name="tablet" :size="14" />{{ u.name }}
        </button>
      </div>
    </div>

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
.demo { display: flex; flex-direction: column; gap: 8px; padding: 12px 14px; border-radius: 12px; background: var(--subtle); border: 1px dashed var(--border-strong); }
.chips { display: flex; flex-wrap: wrap; gap: 6px; }
.chip {
  height: 32px; padding: 0 12px; border-radius: 999px; border: 1px solid var(--border-strong); background: var(--surface);
  font-size: 13px; font-weight: 600; display: inline-flex; align-items: center; gap: 6px;
}
.chip:hover { border-color: var(--accent); color: var(--accent-ink); }
</style>
