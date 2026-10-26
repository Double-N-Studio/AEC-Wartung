<script setup lang="ts">
import { reactive } from 'vue'
import { addFreeOrder, state } from '../../store'
import AppModal from '../../components/AppModal.vue'

const props = withDefaults(defineProps<{ forWhat?: string }>(), { forWhat: 'Lager' })
const emit = defineEmits<{ close: [] }>()
const form = reactive({ name: '', forWhat: props.forWhat, comment: '' })

function submit() {
  if (!form.name.trim()) return
  addFreeOrder(form.name, form.forWhat, form.comment)
  emit('close')
}
</script>

<template>
  <AppModal title="Auf Bestellliste" kicker="Auch für Dinge, die nicht in der Inventur stehen." :width="560" @close="emit('close')">
    <form id="new-order" class="form" @submit.prevent="submit">
      <div class="field">
        <label for="no-name">Was wird gebraucht?</label>
        <input id="no-name" v-model="form.name" class="input" required placeholder="z. B. Schleifpapier P1000">
      </div>
      <div class="field">
        <label for="no-for">Für</label>
        <select id="no-for" v-model="form.forWhat" class="select">
          <option value="Lager">Lager (allgemein)</option>
          <option v-for="a in state.aircraft" :key="a.id" :value="a.type">{{ a.type }}</option>
        </select>
      </div>
      <div class="field">
        <label for="no-comment">Kommentar zur Bestellung</label>
        <textarea id="no-comment" v-model="form.comment" rows="3" class="textarea" placeholder="z. B. Menge, Händler oder Hinweise" />
      </div>
    </form>
    <template #footer>
      <button type="button" class="btn btn-ghost" @click="emit('close')">Abbrechen</button>
      <button type="submit" form="new-order" class="btn btn-primary">Hinzufügen</button>
    </template>
  </AppModal>
</template>

<style scoped>
.form { display: flex; flex-direction: column; gap: 16px; }
</style>
