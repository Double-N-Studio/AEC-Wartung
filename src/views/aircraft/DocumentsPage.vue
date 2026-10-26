<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import { addDocument, state } from '../../store'
import AppIcon from '../../components/AppIcon.vue'
import AppModal from '../../components/AppModal.vue'

const route = useRoute()
const aircraftId = computed(() => String(route.params.id))
const docs = computed(() => state.documents.filter((d) => d.aircraftId === aircraftId.value))

const viewId = ref<string | null>(null)
const viewing = computed(() => docs.value.find((d) => d.id === viewId.value) ?? null)

const adding = ref(false)
const form = reactive({ title: '', kind: 'Handbuch', file: false })
function openAdd() {
  Object.assign(form, { title: '', kind: 'Handbuch', file: false })
  adding.value = true
}
function submit() {
  if (!form.title.trim() || !form.file) return
  addDocument(aircraftId.value, form.title, form.kind)
  adding.value = false
}
</script>

<template>
  <div class="head">
    <h2 class="title">Handbücher und Unterlagen</h2>
    <button type="button" class="btn btn-sm tall" @click="openAdd"><AppIcon name="plus" :size="17" :stroke="2.2" />Dokument hinzufügen</button>
  </div>

  <div class="grid">
    <button v-for="d in docs" :key="d.id" type="button" class="doc" @click="viewId = d.id">
      <span class="preview">
        <img v-if="d.image" :src="d.image" :alt="`Vorschau ${d.title}`" class="page-img">
        <span v-else class="page-img placeholder"><AppIcon name="file" :size="40" :stroke="1.5" /><span>PDF</span></span>
      </span>
      <span class="info"><strong>{{ d.title }}</strong><span class="muted">{{ d.meta }}</span></span>
    </button>
  </div>

  <AppModal v-if="viewing" :title="viewing.title" :kicker="viewing.meta" :width="780" @close="viewId = null">
    <div class="viewer">
      <img v-if="viewing.image" :src="viewing.image" :alt="viewing.title" class="viewer-img">
      <div v-else class="viewer-img placeholder big"><AppIcon name="file" :size="48" :stroke="1.5" /><span>Scan_2027-01-16.pdf</span></div>
    </div>
    <template #footer>
      <button type="button" class="btn"><AppIcon name="download" :size="16" />Herunterladen</button>
    </template>
  </AppModal>

  <AppModal v-if="adding" title="Dokument hinzufügen" kicker="ASG32 · D-3362" :width="560" @close="adding = false">
    <form id="add-doc" class="form" @submit.prevent="submit">
      <div class="field">
        <label for="ad-title">Titel</label>
        <input id="ad-title" v-model="form.title" class="input" required placeholder="z. B. Prüfbericht Bordnetz">
      </div>
      <div class="field">
        <label for="ad-kind">Art</label>
        <select id="ad-kind" v-model="form.kind" class="select">
          <option v-for="k in ['Handbuch', 'Anleitung', 'Prüfbericht', 'Sonstiges']" :key="k" :value="k">{{ k }}</option>
        </select>
      </div>
      <div class="field">
        <span class="field-label">Datei</span>
        <button v-if="!form.file" type="button" class="drop" @click="form.file = true"><AppIcon name="upload" :size="24" :stroke="1.8" />PDF auswählen</button>
        <div v-else class="file">
          <AppIcon name="file" :size="22" :stroke="1.8" />
          <div class="file-info"><strong>Scan_2027-01-16.pdf</strong><span class="muted">2,4 MB</span></div>
          <button type="button" class="btn btn-ghost btn-sm" @click="form.file = false">Entfernen</button>
        </div>
      </div>
    </form>
    <template #footer>
      <button type="button" class="btn btn-ghost" @click="adding = false">Abbrechen</button>
      <button type="submit" form="add-doc" class="btn btn-primary" :disabled="!form.file">Hinzufügen</button>
    </template>
  </AppModal>
</template>

<style scoped>
.head { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.title { font-size: 18px; font-weight: 700; }
.tall { height: 40px; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 16px; }
.doc {
  padding: 0; text-align: left; background: var(--surface); border: 1px solid var(--border); border-radius: 14px;
  overflow: hidden; display: flex; flex-direction: column;
}
.doc:hover { border-color: var(--border-strong); box-shadow: 0 2px 8px rgba(23, 32, 43, 0.08); }
.preview { height: 350px; background: var(--gray-soft); display: flex; align-items: center; justify-content: center; }
.page-img {
  width: 220px; height: 311px; object-fit: cover; object-position: top; background: #fff;
  border-radius: 3px; box-shadow: 0 2px 8px rgba(23, 32, 43, 0.18);
}
.placeholder { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; color: var(--muted); font-size: 13px; font-weight: 600; }
.info { padding: 14px 16px; display: flex; flex-direction: column; gap: 4px; }
.info strong { font-size: 15px; }
.info .muted { font-size: 12.5px; }
.viewer { background: var(--gray-soft); border-radius: 12px; padding: 24px; display: flex; justify-content: center; }
.viewer-img { display: block; width: 100%; max-width: 660px; height: auto; background: #fff; box-shadow: 0 2px 10px rgba(23, 32, 43, 0.18); }
.viewer-img.big { aspect-ratio: 210 / 297; }
.form { display: flex; flex-direction: column; gap: 16px; }
.drop {
  height: 96px; border-radius: 12px; border: 1.5px dashed #A3ADB9; background: var(--subtle);
  font-size: 14px; font-weight: 600; color: var(--accent-ink); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px;
}
.file { display: flex; align-items: center; gap: 12px; min-height: 56px; padding: 0 12px; border-radius: 12px; border: 1px solid var(--border); background: var(--subtle); color: var(--muted); }
.file-info { display: flex; flex-direction: column; flex: 1; color: var(--text); font-size: 14px; }
.file-info .muted { font-size: 12px; }
.btn-primary:disabled { opacity: 0.5; cursor: default; }
@media (max-width: 640px) {
  .grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
  .preview { height: 220px; }
  .page-img { width: 130px; height: 184px; }
  .viewer { padding: 10px; }
}
</style>
