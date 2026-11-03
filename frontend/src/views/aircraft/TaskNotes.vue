<script setup lang="ts">
import { ref } from 'vue'
import { addTaskNote, can, currentUser, deleteTaskNote, userName } from '../../store'
import type { FileRef, Task, TaskNote } from '../../types'
import { fmtWhen } from '../../utils/date'
import AppIcon from '../../components/AppIcon.vue'
import ConfirmModal from '../../components/ConfirmModal.vue'
import PersonAvatar from '../../components/PersonAvatar.vue'
import PhotoStrip from '../../components/PhotoStrip.vue'

/** Notes with photos on a Kanban card. editable: the card is not signed off and the account may edit. */
const props = defineProps<{ task: Task; editable: boolean }>()

const text = ref('')
const photos = ref<FileRef[]>([])
function save() {
  addTaskNote(props.task, text.value, photos.value)
  text.value = ''
  photos.value = []
}

// Everyone may delete their own notes, the workshop lead all of them.
const canDelete = (n: TaskNote) => props.editable && (n.who === currentUser()?.id || can('lead'))
const removing = ref<TaskNote | null>(null)
function confirmRemove() {
  if (removing.value) deleteTaskNote(props.task, removing.value)
  removing.value = null
}
</script>

<template>
  <section class="notes" aria-label="Notizen">
    <h3 class="notes-title">Notizen<span v-if="task.notes?.length" class="count">{{ task.notes.length }}</span></h3>
    <article v-for="n in task.notes" :key="n.id" class="note">
      <PersonAvatar :person="n.who" :size="30" />
      <div class="note-body">
        <div class="note-head">
          <strong>{{ userName(n.who) }}</strong><span class="muted">{{ fmtWhen(n.at) }}</span>
          <button v-if="canDelete(n)" type="button" class="note-remove" aria-label="Notiz löschen" title="Notiz löschen" @click="removing = n">
            <AppIcon name="trash" :size="15" />
          </button>
        </div>
        <p v-if="n.text" class="note-text">{{ n.text }}</p>
        <PhotoStrip v-if="n.photos.length" :model-value="n.photos" small />
      </div>
    </article>
    <p v-if="!task.notes?.length && !editable" class="muted empty">Keine Notizen.</p>

    <div v-if="editable" class="add">
      <label for="tn-text" class="sr-only">Notiz hinzufügen</label>
      <textarea id="tn-text" v-model="text" rows="2" class="textarea" placeholder="Was ist dir aufgefallen? z. B. Lager hat Spiel, Ersatzteil nötig …" />
      <PhotoStrip v-model="photos" editable small />
      <button type="button" class="btn btn-sm save" :disabled="!text.trim() && !photos.length" @click="save">Notiz speichern</button>
    </div>
  </section>

  <ConfirmModal v-if="removing" title="Notiz löschen?" text="Die Notiz wird mit ihren Fotos gelöscht." @confirm="confirmRemove" @close="removing = null" />
</template>

<style scoped>
.notes { display: flex; flex-direction: column; gap: 12px; }
.notes-title { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 700; }
.notes-title .count { background: var(--gray-soft); }
.note { display: flex; gap: 10px; }
.note-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 6px; }
.note-head { display: flex; align-items: center; gap: 8px; font-size: 13px; }
.note-head .muted { font-size: 12.5px; }
.note-remove {
  margin-left: auto; width: 30px; height: 30px; border: 0; border-radius: 8px; background: transparent; color: var(--muted);
  display: inline-flex; align-items: center; justify-content: center;
}
.note-remove:hover { background: var(--subtle); color: var(--red-ink); }
.note-text { font-size: 14px; line-height: 1.5; white-space: pre-line; }
.empty { font-size: 13.5px; }
.add { display: flex; flex-direction: column; gap: 8px; }
.save { align-self: flex-end; }
</style>
