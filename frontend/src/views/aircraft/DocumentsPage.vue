<script setup lang="ts">
import { computed, reactive, ref, watch, watchEffect } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { addDocument, aircraftLabel, can, deleteDocument, docInput, docsFor, docScope, state, updateDocument, userName, type DocScope } from '../../store'
import type { DocKind, DocumentItem, FileRef } from '../../types'
import { downloadFile, fileUrl, fmtSize, uploadFile } from '../../api/files'
import { fmtDate } from '../../utils/date'
import { pdfPreview } from '../../utils/pdfPreview'
import AppIcon from '../../components/AppIcon.vue'
import AppModal from '../../components/AppModal.vue'
import ConfirmModal from '../../components/ConfirmModal.vue'

const route = useRoute()
const router = useRouter()
const aircraftId = computed(() => String(route.params.id))
const type = computed(() => state.aircraft.find((a) => a.id === aircraftId.value)?.type ?? '')
const docs = computed(() => docsFor(aircraftId.value))

const SCOPES: { key: DocScope; title: () => string }[] = [
  { key: 'aircraft', title: () => 'Dieses Flugzeug' },
  { key: 'type', title: () => `Alle ${type.value}` },
  { key: 'club', title: () => 'Ganzer Verein' },
]
const groups = computed(() => SCOPES.map((s) => ({ ...s, list: docs.value.filter((d) => docScope(d) === s.key) })).filter((g) => g.list.length))

const meta = (d: DocumentItem) => [d.file ? (d.file.type === 'application/pdf' ? 'PDF' : 'Bild') : 'PDF', d.kind, d.version].filter(Boolean).join(' · ')
const isPdf = (f?: FileRef) => f?.type === 'application/pdf'

// URLs of the uploaded files (preview, display, download)
const urls = reactive<Record<string, string | null>>({})
watchEffect(async () => {
  for (const d of docs.value) {
    for (const f of [d.file, d.preview]) if (f && !(f.id in urls)) urls[f.id] = await fileUrl(f)
  }
})
// PDFs uploaded before previews existed: render the first page here (kept per PDF while the app is open).
const rendered = reactive<Record<string, string | null>>({})
watchEffect(async () => {
  for (const d of docs.value) {
    const f = d.file
    if (!f || !isPdf(f) || d.preview || d.image || f.id in rendered || !urls[f.id]) continue
    rendered[f.id] = null
    try {
      rendered[f.id] = URL.createObjectURL(await pdfPreview(urls[f.id]!))
    } catch {
      // Unreadable PDF: the placeholder stays.
    }
  }
})
const previewOf = (d: DocumentItem) => d.image
  ?? (d.preview ? urls[d.preview.id] : null)
  ?? (d.file && !isPdf(d.file) ? urls[d.file.id] : d.file ? rendered[d.file.id] : null)

// ?dokument=<id> opens a document directly (link from the Kanban card).
const viewId = ref<string | null>(null)
watch(() => route.query.dokument, (id) => { if (typeof id === 'string') viewId.value = id }, { immediate: true })
const viewing = computed(() => docs.value.find((d) => d.id === viewId.value) ?? null)
function closeViewer() {
  viewId.value = null
  if (route.query.dokument) router.replace({ query: {} })
}
async function download(d: DocumentItem) {
  if (d.file) await downloadFile(d.file)
  else if (d.image) {
    const a = document.createElement('a')
    a.href = d.image
    a.download = d.image.split('/').pop()!
    a.click()
  }
}

/* Adding and editing share one form. */
const KINDS: DocKind[] = ['Flughandbuch', 'Wartungshandbuch', 'Anleitung', 'Prüfbericht', 'Sonstiges']
const editing = ref<DocumentItem | 'new' | null>(null)
const form = reactive(docInput())
function openForm(doc: DocumentItem | 'new') {
  Object.assign(form, docInput(doc === 'new' ? undefined : doc))
  uploadError.value = ''
  editing.value = doc
}
const fileInput = ref<HTMLInputElement | null>(null)
const uploading = ref(false)
const uploadError = ref('')
async function onFile(e: Event) {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  target.value = ''
  if (!file) return
  uploading.value = true
  uploadError.value = ''
  try {
    form.file = await uploadFile(file, file.name)
    form.preview = file.type === 'application/pdf' ? await previewFor(file) : null
    if (!form.title.trim()) form.title = file.name.replace(/\.\w+$/, '')
  } catch (e) {
    uploadError.value = e instanceof Error && e.message.startsWith('Die Datei') ? e.message : 'Die Datei konnte nicht gespeichert werden.'
  }
  uploading.value = false
}
/** First page as an image; without it the grid renders the PDF itself. */
async function previewFor(file: File) {
  try {
    return await uploadFile(await pdfPreview(file), `${file.name.replace(/\.pdf$/i, '')} (Vorschau).jpg`)
  } catch {
    return null
  }
}
function submit() {
  if (!form.title.trim()) return
  if (editing.value === 'new') {
    if (!form.file) return
    addDocument(aircraftId.value, form)
  } else if (editing.value) {
    updateDocument(editing.value, aircraftId.value, form)
  }
  editing.value = null
}
const sharedNote = computed(() => (form.scope === 'aircraft' ? '' : form.scope === 'type' ? `Erscheint bei allen ${type.value}.` : 'Erscheint bei allen Flugzeugen.'))

const removing = ref<DocumentItem | null>(null)
function confirmRemove() {
  if (removing.value) deleteDocument(removing.value)
  removing.value = null
  closeViewer()
}
</script>

<template>
  <div class="head">
    <h2 class="title">Handbücher und Unterlagen</h2>
    <button v-if="can('edit')" type="button" class="btn btn-sm tall" @click="openForm('new')"><AppIcon name="plus" :size="17" :stroke="2.2" />Dokument hinzufügen</button>
  </div>

  <section v-for="g in groups" :key="g.key" class="group" :aria-label="g.title()">
    <h3 v-if="groups.length > 1 || g.key !== 'aircraft'" class="group-title">{{ g.title() }}</h3>
    <div class="grid">
      <button v-for="d in g.list" :key="d.id" type="button" class="doc" @click="viewId = d.id">
        <span class="preview">
          <img v-if="previewOf(d)" :src="previewOf(d)!" :alt="`Vorschau ${d.title}`" class="page-img">
          <span v-else class="page-img placeholder"><AppIcon name="file" :size="40" :stroke="1.5" /><span>{{ d.file?.name ?? 'PDF' }}</span></span>
        </span>
        <span class="info"><strong>{{ d.title }}</strong><span class="muted">{{ meta(d) }}</span></span>
      </button>
    </div>
  </section>
  <p v-if="!docs.length" class="muted empty">Noch keine Dokumente.</p>

  <AppModal v-if="viewing && !editing && !removing" :title="viewing.title" icon="file" :subtitle="meta(viewing)" :width="900" @close="closeViewer">
    <template v-if="can('edit')" #tools>
      <button type="button" class="tool" aria-label="Bearbeiten" title="Bearbeiten" @click="openForm(viewing)"><AppIcon name="pen" :size="19" /></button>
      <button type="button" class="tool" aria-label="Löschen" title="Löschen" @click="removing = viewing"><AppIcon name="trash" :size="19" /></button>
    </template>
    <div class="viewer">
      <iframe v-if="viewing.file && isPdf(viewing.file) && urls[viewing.file.id]" :src="urls[viewing.file.id]!" :title="viewing.title" class="pdf" />
      <img v-else-if="previewOf(viewing)" :src="previewOf(viewing)!" :alt="viewing.title" class="viewer-img">
      <div v-else class="viewer-img placeholder big"><AppIcon name="file" :size="48" :stroke="1.5" /><span>Keine Datei hinterlegt</span></div>
    </div>
    <template #meta>Hinzugefügt von {{ userName(viewing.addedBy) }} · {{ fmtDate(viewing.addedAt) }}</template>
    <template #footer>
      <a v-if="viewing.file && urls[viewing.file.id]" :href="urls[viewing.file.id]!" target="_blank" rel="noopener" class="btn btn-ghost">In neuem Tab öffnen</a>
      <button type="button" class="btn" :disabled="!viewing.file && !viewing.image" @click="download(viewing)"><AppIcon name="download" :size="16" />Herunterladen</button>
    </template>
  </AppModal>

  <AppModal
    v-if="editing" :title="editing === 'new' ? 'Dokument hinzufügen' : 'Dokument bearbeiten'" :icon="editing === 'new' ? 'upload' : 'file'"
    :subtitle="aircraftLabel(aircraftId)" :width="560" @close="editing = null"
  >
    <form id="doc-form" class="form" @submit.prevent="submit">
      <div class="field">
        <span class="field-label">{{ editing === 'new' ? 'Datei' : 'Datei (neue Version hochladen, optional)' }}</span>
        <input ref="fileInput" type="file" accept="application/pdf,image/*" class="sr-only" tabindex="-1" @change="onFile">
        <div v-if="form.file" class="file">
          <AppIcon name="file" :size="22" :stroke="1.8" />
          <div class="file-info"><strong>{{ form.file.name }}</strong><span class="muted">{{ fmtSize(form.file.size) }}</span></div>
          <button type="button" class="btn btn-ghost btn-sm" @click="fileInput?.click()">Ersetzen</button>
        </div>
        <button v-else type="button" class="drop" :disabled="uploading" @click="fileInput?.click()">
          <AppIcon name="upload" :size="24" :stroke="1.8" />{{ uploading ? 'Lädt hoch …' : 'PDF oder Bild auswählen' }}
        </button>
        <span v-if="uploadError" class="error">{{ uploadError }}</span>
      </div>
      <div class="field">
        <label for="ad-title">Titel</label>
        <input id="ad-title" v-model="form.title" class="input" required placeholder="z. B. Prüfbericht Bordnetz">
      </div>
      <div class="two">
        <div class="field">
          <label for="ad-kind">Art</label>
          <select id="ad-kind" v-model="form.kind" class="select">
            <option v-for="k in KINDS" :key="k" :value="k">{{ k }}</option>
          </select>
        </div>
        <div class="field">
          <label for="ad-version">Ausgabe / Stand <span class="muted hint">(optional)</span></label>
          <input id="ad-version" v-model="form.version" class="input" placeholder="z. B. Ausgabe 01.12.2015">
        </div>
      </div>
      <div class="field">
        <label for="ad-scope">Gilt für</label>
        <select id="ad-scope" v-model="form.scope" class="select">
          <option value="aircraft">Nur {{ aircraftLabel(aircraftId) }}</option>
          <option value="type">Alle {{ type }}</option>
          <option value="club">Ganzer Verein (alle Flugzeuge)</option>
        </select>
        <span v-if="sharedNote" class="muted hint">{{ sharedNote }}</span>
      </div>
    </form>
    <template #footer>
      <button type="button" class="btn btn-ghost" @click="editing = null">Abbrechen</button>
      <button type="submit" form="doc-form" class="btn btn-primary" :disabled="(editing === 'new' && !form.file) || uploading">{{ editing === 'new' ? 'Hinzufügen' : 'Speichern' }}</button>
    </template>
  </AppModal>

  <ConfirmModal
    v-if="removing" title="Dokument löschen?"
    :text="`„${removing.title}“ wird gelöscht${docScope(removing) === 'aircraft' ? '' : ' – bei allen Flugzeugen, für die es gilt'}. Kanban-Karten, die darauf verweisen, verlieren den Link.`"
    @confirm="confirmRemove" @close="removing = null"
  />
</template>

<style scoped>
.head { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.title { font-size: 18px; font-weight: 700; }
.tall { height: 40px; }
.group { display: flex; flex-direction: column; gap: 10px; }
.group-title { font-size: 13px; font-weight: 700; color: var(--text-2); }
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
.placeholder { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; padding: 12px; color: var(--muted); font-size: 13px; font-weight: 600; text-align: center; overflow-wrap: anywhere; }
.info { padding: 14px 16px; display: flex; flex-direction: column; gap: 4px; }
.info strong { font-size: 15px; }
.info .muted { font-size: 12.5px; }
.viewer { background: var(--gray-soft); border-radius: 12px; padding: 24px; display: flex; justify-content: center; }
.viewer-img { display: block; width: 100%; max-width: 660px; height: auto; background: #fff; box-shadow: 0 2px 10px rgba(23, 32, 43, 0.18); }
.viewer-img.big { aspect-ratio: 210 / 297; }
.pdf { width: 100%; height: 70vh; border: 0; background: #fff; }
.form { display: flex; flex-direction: column; gap: 16px; }
.two { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.hint { font-weight: 500; font-size: 12.5px; }
.error { font-size: 13px; font-weight: 600; color: var(--red-ink); }
.drop {
  height: 96px; border-radius: 12px; border: 1.5px dashed var(--border-strong); background: var(--subtle);
  font-size: 14px; font-weight: 600; color: var(--accent-ink); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px;
}
.file { display: flex; align-items: center; gap: 12px; min-height: 56px; padding: 0 12px; border-radius: 12px; border: 1px solid var(--border); background: var(--subtle); color: var(--muted); }
.file-info { display: flex; flex-direction: column; flex: 1; min-width: 0; color: var(--text); font-size: 14px; overflow-wrap: anywhere; }
.file-info .muted { font-size: 12px; }
a.btn { text-decoration: none; }
.empty { padding: 24px 0; text-align: center; font-size: 14px; }
@media (max-width: 640px) {
  .grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
  .preview { height: 220px; }
  .page-img { width: 130px; height: 184px; }
  .viewer { padding: 10px; }
  .two { grid-template-columns: 1fr; }
}
</style>
