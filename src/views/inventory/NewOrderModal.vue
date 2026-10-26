<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { addFreeOrder, addItemToOrders, openOrderFor, state } from '../../store'
import type { InventoryItem } from '../../types'
import { similarByName } from '../../utils/similar'
import AppModal from '../../components/AppModal.vue'

const props = withDefaults(defineProps<{ forWhat?: string }>(), { forWhat: 'Lager' })
const emit = defineEmits<{ close: [] }>()
const form = reactive({ name: '', forWhat: props.forWhat, comment: '' })

// Ähnlich benannte Artikel aus der Inventur vorschlagen, damit die Bestellung dem Artikel zugeordnet wird.
const item = ref<InventoryItem | null>(null)
const dismissed = ref(false)
const suggestions = computed(() => (item.value || dismissed.value ? [] : similarByName(form.name, state.inventory)))
const existing = computed(() => (item.value ? openOrderFor(item.value.id) : undefined))
const kindText = (i: InventoryItem) => (i.kind === 'vs' ? 'Verbrauchsstoff' : 'Ersatzteil')

function pick(i: InventoryItem) {
  item.value = i
  form.name = i.name
}

function unlink() {
  item.value = null
  dismissed.value = true
}

function submit() {
  if (item.value) {
    if (existing.value) return
    addItemToOrders(item.value, form.forWhat, form.comment)
  } else {
    if (!form.name.trim()) return
    addFreeOrder(form.name, form.forWhat, form.comment)
  }
  emit('close')
}
</script>

<template>
  <AppModal title="Auf Bestellliste" icon="box" subtitle="Auch für Dinge, die nicht in der Inventur stehen." :width="560" @close="emit('close')">
    <form id="new-order" class="form" @submit.prevent="submit">
      <div class="field">
        <label for="no-name">Was wird gebraucht?</label>
        <div v-if="item" class="linked">
          <span class="linked-text">
            <strong>{{ item.name }}</strong>
            <span class="muted small">Artikel aus der Inventur · {{ kindText(item) }} · {{ item.location }}</span>
          </span>
          <button type="button" class="btn btn-sm btn-ghost" @click="unlink">Zuordnung aufheben</button>
        </div>
        <input v-else id="no-name" v-model="form.name" class="input" required autocomplete="off" placeholder="z. B. Schleifpapier P1000">
        <div v-if="suggestions.length" class="suggest" role="group" aria-label="Ähnliche Artikel in der Inventur">
          <span>Meinst du</span>
          <template v-for="(s, i) in suggestions" :key="s.id">
            <span v-if="i > 0">oder</span>
            <button type="button" class="suggest-item" :title="`${kindText(s)} · ${s.location}`" @click="pick(s)">
              <strong>{{ s.name }}</strong>
            </button>
          </template>
          <span class="suggest-end">?</span>
          <button type="button" class="suggest-dismiss" aria-label="Vorschlag ausblenden" @click="dismissed = true">Nein</button>
        </div>
        <p v-if="existing" class="notice">
          {{ existing.state === 'ordered' ? 'Dieser Artikel ist bereits bestellt.' : 'Dieser Artikel steht bereits auf der Bestellliste.' }}
        </p>
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
      <button type="submit" form="new-order" class="btn btn-primary" :disabled="!!existing">Hinzufügen</button>
    </template>
  </AppModal>
</template>

<style scoped>
.form { display: flex; flex-direction: column; gap: 16px; }
.small { font-size: 12.5px; }
.linked {
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  padding: 10px 12px; border-radius: 10px; border: 1px solid var(--accent); background: var(--accent-tint);
}
.linked-text, .suggest-item { display: flex; flex-direction: column; gap: 2px; min-width: 0; text-align: left; font-size: 14px; }
.suggest { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 6px; font-size: 13px; color: var(--muted); }
.suggest-item {
  flex-direction: row; align-items: baseline; gap: 6px; padding: 2px 4px; border: 0; border-radius: 6px; background: transparent;
  font-size: 13px; color: var(--accent-ink); text-decoration: underline; text-underline-offset: 2px;
}
.suggest-item strong { font-weight: 600; }
.suggest-item:hover { background: var(--accent-tint); }
.suggest-end { margin-left: -6px; }
.suggest-dismiss { padding: 2px 4px; border: 0; background: transparent; font-size: 12.5px; color: var(--muted); }
.suggest-dismiss:hover { color: var(--text-2); text-decoration: underline; }
.notice { font-size: 13px; color: var(--text-2); }
.btn-primary:disabled { opacity: 0.5; cursor: default; }
</style>
