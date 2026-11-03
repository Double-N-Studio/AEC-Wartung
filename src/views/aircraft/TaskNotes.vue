<script setup lang="ts">
import { ref } from 'vue'
import { addTaskNote, can, currentUser, deleteTaskNote, userName } from '../../store'
import type { Task, TaskNote } from '../../types'
import { fmtWhen } from '../../utils/date'
import AppIcon from '../../components/AppIcon.vue'
import ConfirmModal from '../../components/ConfirmModal.vue'
import PersonAvatar from '../../components/PersonAvatar.vue'

/** Notizen mit Fotos an einer Kanban-Karte. editable: Karte ist nicht abgezeichnet und das Konto darf bearbeiten. */
const props = defineProps<{ task: Task; editable: boolean }>()

const MAX_PHOTOS = 6
const text = ref('')
const photos = ref(0)
function save() {
  addTaskNote(props.task, text.value, photos.value)
  text.value = ''
  photos.value = 0
}

// Eigene Notizen darf man löschen, die Werkstattleitung alle.
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
        <div v-if="n.photos" class="photos">
          <div v-for="i in n.photos" :key="i" class="photo small"><AppIcon name="image" :size="18" :stroke="1.8" /><span>Foto {{ i }}</span></div>
        </div>
      </div>
    </article>
    <p v-if="!task.notes?.length && !editable" class="muted empty">Keine Notizen.</p>

    <div v-if="editable" class="add">
      <label for="tn-text" class="sr-only">Notiz hinzufügen</label>
      <textarea id="tn-text" v-model="text" rows="2" class="textarea" placeholder="Was ist dir aufgefallen? z. B. Lager hat Spiel, Ersatzteil nötig …" />
      <div class="photos">
        <div v-for="i in photos" :key="i" class="photo small">
          <AppIcon name="image" :size="18" :stroke="1.8" /><span>Foto {{ i }}</span>
          <button type="button" class="photo-remove" :aria-label="`Foto ${i} entfernen`" @click="photos--"><AppIcon name="x" :size="12" :stroke="2.4" /></button>
        </div>
        <button v-if="photos < MAX_PHOTOS" type="button" class="shoot" @click="photos++"><AppIcon name="camera" :size="18" :stroke="1.8" />Foto aufnehmen</button>
      </div>
      <button type="button" class="btn btn-sm save" :disabled="!text.trim() && !photos" @click="save">Notiz speichern</button>
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
.photos { display: flex; gap: 8px; flex-wrap: wrap; }
.photo {
  position: relative; border-radius: 10px; background: #DDE3EA; color: var(--muted);
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; font-size: 11px;
}
.photo.small { width: 72px; height: 72px; }
.shoot {
  height: 40px; padding: 0 14px; border-radius: 10px; border: 1.5px dashed #A3ADB9; background: var(--subtle);
  font-size: 13px; font-weight: 600; color: var(--accent-ink); display: inline-flex; align-items: center; gap: 6px;
}
.photo-remove {
  position: absolute; top: 3px; right: 3px; width: 22px; height: 22px; border: 0; border-radius: 50%;
  display: inline-flex; align-items: center; justify-content: center; background: var(--surface); color: var(--text-2);
  box-shadow: 0 1px 3px rgba(23, 32, 43, 0.2);
}
.save { align-self: flex-end; }
</style>
