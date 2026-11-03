<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { enterName, logout, session } from '../../store'
import AppIcon from '../AppIcon.vue'
import AppModal from '../AppModal.vue'
import { authDialog } from './authDialog'

/** „Wer bist du?“ – Mitglieder geben ohne Passwort Vor- und Nachnamen ein; der Browser merkt sich das. */
const form = reactive({ first: '', last: '' })
const complete = computed(() => !!form.first.trim() && !!form.last.trim())
const needsLogin = ref(false)
const busy = ref(false)
const failed = ref(false)

async function submit() {
  if (!complete.value || busy.value) return
  busy.value = true
  failed.value = false
  try {
    needsLogin.value = (await enterName(form.first, form.last)) === 'login'
    if (!needsLogin.value) authDialog.value = null
  } catch {
    failed.value = true
  }
  busy.value = false
}

/** Schließen ohne Eingabe heißt beim ersten Besuch: erst einmal nur ansehen. */
function close() {
  if (!session.chosen) logout()
  authDialog.value = null
}
</script>

<template>
  <AppModal priority title="Wer bist du?" icon="user" subtitle="Dein Name steht dann bei allem, was du einträgst." :width="520" @close="close">
    <p class="hint">Kein Passwort nötig. Dein Handy merkt sich den Namen, du gibst ihn also nur einmal ein.</p>
    <form id="name-form" class="form" @submit.prevent="submit">
      <div class="two">
        <div class="field">
          <label for="nm-first">Vorname</label>
          <input id="nm-first" v-model="form.first" class="input" required autocomplete="given-name" @input="needsLogin = false">
        </div>
        <div class="field">
          <label for="nm-last">Nachname</label>
          <input id="nm-last" v-model="form.last" class="input" required autocomplete="family-name" @input="needsLogin = false">
        </div>
      </div>
      <p v-if="failed" class="error">Keine Verbindung zum Server. Bitte gleich noch einmal versuchen.</p>
      <p v-if="needsLogin" class="error">
        Dieses Konto braucht ein Passwort.
        <button type="button" class="link-btn" @click="authDialog = 'login'">Jetzt anmelden</button>
      </p>
    </form>

    <template #meta>
      <button type="button" class="link-btn" @click="authDialog = 'login'"><AppIcon name="shield" :size="15" />Werkstattleitung, Admin oder Tablet? Anmelden</button>
    </template>
    <template #footer>
      <button type="button" class="btn btn-ghost" @click="logout(); authDialog = null">Nur ansehen</button>
      <button type="submit" form="name-form" class="btn btn-primary" :disabled="!complete || busy">{{ busy ? 'Einen Moment …' : 'Weiter' }}</button>
    </template>
  </AppModal>
</template>

<style scoped>
.hint { font-size: 14px; color: var(--text-2); line-height: 1.5; }
.form { display: flex; flex-direction: column; gap: 12px; }
.two { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.error { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; font-size: 13px; font-weight: 600; color: var(--red-ink); }
@media (max-width: 640px) {
  .two { grid-template-columns: 1fr; }
}
</style>
