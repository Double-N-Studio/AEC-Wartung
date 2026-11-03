<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { setPassword } from '../store'
import { authDialog } from '../components/account/authDialog'

/** Target of the link an admin passes on (#/passwort?token=…): special accounts set their password here. */
const route = useRoute()
const router = useRouter()
const token = computed(() => String(route.query.token ?? ''))

const MIN = 10
const form = reactive({ password: '', repeat: '' })
const error = ref('')
const busy = ref(false)
const done = ref(false)

async function submit() {
  error.value = ''
  if (form.password.length < MIN) error.value = `Mindestens ${MIN} Zeichen.`
  else if (form.password !== form.repeat) error.value = 'Die beiden Eingaben sind nicht gleich.'
  if (error.value || busy.value) return
  busy.value = true
  try {
    if (await setPassword(token.value, form.password)) done.value = true
    else error.value = 'Der Link ist abgelaufen oder wurde schon benutzt. Ein Admin kann dir einen neuen geben.'
  } catch {
    error.value = 'Keine Verbindung zum Server. Bitte gleich noch einmal versuchen.'
  }
  busy.value = false
}

function toLogin() {
  router.replace('/')
  authDialog.value = 'login'
}
</script>

<template>
  <div class="page">
    <header>
      <h1 class="page-title">Passwort setzen</h1>
      <p class="page-sub">Für Werkstattleitung, Admins und das Werkstatt-Tablet.</p>
    </header>

    <section class="card box">
      <template v-if="!token">
        <p>Dieser Link ist unvollständig. Öffne bitte den ganzen Link, den du vom Admin bekommen hast.</p>
      </template>
      <template v-else-if="done">
        <p>Dein Passwort ist gespeichert. Du kannst dich jetzt anmelden.</p>
        <div><button type="button" class="btn btn-primary" @click="toLogin">Anmelden</button></div>
      </template>
      <form v-else class="form" @submit.prevent="submit">
        <div class="field">
          <label for="pw-new">Neues Passwort</label>
          <input id="pw-new" v-model="form.password" type="password" class="input" required autocomplete="new-password" :minlength="MIN">
        </div>
        <div class="field">
          <label for="pw-repeat">Noch einmal</label>
          <input id="pw-repeat" v-model="form.repeat" type="password" class="input" required autocomplete="new-password">
        </div>
        <p v-if="error" class="error">{{ error }}</p>
        <div><button type="submit" class="btn btn-primary" :disabled="busy">{{ busy ? 'Speichert …' : 'Passwort speichern' }}</button></div>
      </form>
    </section>
  </div>
</template>

<style scoped>
.box { max-width: 480px; padding: 20px; display: flex; flex-direction: column; gap: 14px; font-size: 14px; }
.form { display: flex; flex-direction: column; gap: 16px; }
.error { font-size: 13px; font-weight: 600; color: var(--red-ink); }
</style>
