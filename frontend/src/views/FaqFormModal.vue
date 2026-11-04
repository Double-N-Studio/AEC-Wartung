<script setup lang="ts">
import { reactive, ref } from 'vue'
import { createFaq, deleteFaq, faqInput, updateFaq } from '../store'
import type { FaqEntry } from '../types'
import AppIcon from '../components/AppIcon.vue'
import AppModal from '../components/AppModal.vue'
import ConfirmModal from '../components/ConfirmModal.vue'

/** Create a FAQ entry or (with entry) edit one. */
const props = defineProps<{ entry?: FaqEntry }>()
const emit = defineEmits<{ close: [] }>()

const form = reactive(faqInput(props.entry))

function submit() {
  if (!form.q.trim() || !form.a.trim()) return
  if (props.entry) updateFaq(props.entry, form)
  else createFaq(form)
  emit('close')
}

const confirming = ref(false)
function remove() {
  if (props.entry) deleteFaq(props.entry)
  emit('close')
}
</script>

<template>
  <AppModal :title="props.entry ? 'Frage bearbeiten' : 'Frage anlegen'" icon="help" subtitle="FAQ" :width="640" @close="emit('close')">
    <template v-if="props.entry" #tools>
      <button type="button" class="tool" aria-label="Löschen" title="Löschen" @click="confirming = true"><AppIcon name="trash" :size="19" /></button>
    </template>
    <form id="faq-form" class="form" @submit.prevent="submit">
      <div class="field">
        <label for="faq-q">Frage</label>
        <input id="faq-q" v-model="form.q" class="input" required placeholder="z. B. Wann ist Werkstatt?">
      </div>
      <div class="field">
        <label for="faq-a">Antwort</label>
        <textarea id="faq-a" v-model="form.a" rows="5" class="textarea" required />
      </div>
    </form>
    <template #footer>
      <button type="button" class="btn btn-ghost" @click="emit('close')">Abbrechen</button>
      <button type="submit" form="faq-form" class="btn btn-primary">{{ props.entry ? 'Speichern' : 'Anlegen' }}</button>
    </template>
  </AppModal>
  <ConfirmModal v-if="confirming" title="Frage löschen?" :text="`„${form.q}“ wird gelöscht.`" @confirm="remove" @close="confirming = false" />
</template>

<style scoped>
.form { display: flex; flex-direction: column; gap: 16px; }
</style>
