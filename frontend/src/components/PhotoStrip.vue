<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue'
import type { FileRef } from '../types'
import { compressImage, downloadFile, fileUrl, uploadFile } from '../api/files'
import AppIcon from './AppIcon.vue'
import AppModal from './AppModal.vue'

/**
 * Show photos (tap = enlarge) and, with editable, take or remove them.
 * Photos without a file (sample data) appear as placeholders.
 */
const props = withDefaults(defineProps<{ modelValue: FileRef[]; editable?: boolean; small?: boolean; max?: number }>(), { max: 6 })
const emit = defineEmits<{ 'update:modelValue': [refs: FileRef[]] }>()

const urls = reactive<Record<string, string | null>>({})
async function resolve(list: FileRef[]) {
  for (const f of list) if (!(f.id in urls)) urls[f.id] = await fileUrl(f)
}
onMounted(() => resolve(props.modelValue))
watch(() => props.modelValue, resolve)

const input = ref<HTMLInputElement | null>(null)
const uploading = ref(0)
const failed = ref(false)
async function onFiles(e: Event) {
  const target = e.target as HTMLInputElement
  const files = [...(target.files ?? [])].slice(0, props.max - props.modelValue.length)
  target.value = ''
  failed.value = false
  uploading.value = files.length
  const added: FileRef[] = []
  for (const file of files) {
    try {
      added.push(await uploadFile(await compressImage(file), file.name.replace(/\.\w+$/, '.jpg')))
    } catch {
      failed.value = true
    }
    uploading.value -= 1
  }
  if (added.length) emit('update:modelValue', [...props.modelValue, ...added])
}
const removePhoto = (f: FileRef) => emit('update:modelValue', props.modelValue.filter((x) => x.id !== f.id))

const viewing = ref<FileRef | null>(null)
</script>

<template>
  <div class="strip" :class="{ small }">
    <div v-for="(f, i) in modelValue" :key="f.id" class="photo">
      <button v-if="urls[f.id]" type="button" class="photo-btn" :aria-label="`Foto ${i + 1} groß anzeigen`" @click="viewing = f">
        <img :src="urls[f.id]!" :alt="`Foto ${i + 1}`">
      </button>
      <span v-else class="placeholder"><AppIcon name="image" :size="small ? 18 : 22" :stroke="1.8" /><span>Beispielfoto</span></span>
      <button v-if="editable" type="button" class="photo-remove" :aria-label="`Foto ${i + 1} entfernen`" @click="removePhoto(f)">
        <AppIcon name="x" :size="12" :stroke="2.4" />
      </button>
    </div>
    <span v-for="n in uploading" :key="`up-${n}`" class="photo placeholder"><AppIcon name="upload" :size="18" /><span>Lädt …</span></span>
    <template v-if="editable && modelValue.length + uploading < max">
      <input ref="input" type="file" accept="image/*" capture="environment" multiple class="sr-only" tabindex="-1" @change="onFiles">
      <button type="button" class="shoot" @click="input?.click()"><AppIcon name="camera" :size="small ? 18 : 24" :stroke="1.8" />Foto aufnehmen</button>
    </template>
    <p v-if="failed" class="error">Ein Foto konnte nicht gespeichert werden.</p>
  </div>

  <AppModal v-if="viewing" :title="viewing.name" icon="image" :width="960" @close="viewing = null">
    <img :src="urls[viewing.id]!" :alt="viewing.name" class="full">
    <template #footer>
      <button type="button" class="btn" @click="downloadFile(viewing)"><AppIcon name="download" :size="16" />Herunterladen</button>
    </template>
  </AppModal>
</template>

<style scoped>
.strip { display: flex; gap: 10px; flex-wrap: wrap; }
.photo { position: relative; width: 96px; height: 96px; border-radius: 12px; overflow: hidden; flex-shrink: 0; }
.small .photo { width: 72px; height: 72px; border-radius: 10px; }
.photo-btn { width: 100%; height: 100%; padding: 0; border: 0; background: var(--gray-soft); }
.photo-btn img { width: 100%; height: 100%; object-fit: cover; display: block; }
.placeholder {
  width: 100%; height: 100%; background: var(--gray-soft); color: var(--muted);
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; font-size: 11px; text-align: center;
}
.photo.placeholder { display: flex; }
.shoot {
  flex: 1; min-width: 140px; height: 96px; border-radius: 12px; border: 1.5px dashed var(--border-strong); background: var(--subtle);
  font-size: 14px; font-weight: 600; color: var(--accent-ink); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px;
}
.small .shoot { flex: 0 0 auto; height: 40px; min-width: 0; padding: 0 14px; flex-direction: row; font-size: 13px; border-radius: 10px; }
.photo-remove {
  position: absolute; top: 4px; right: 4px; width: 24px; height: 24px; border: 0; border-radius: 50%;
  display: inline-flex; align-items: center; justify-content: center; background: var(--surface); color: var(--text-2);
  box-shadow: 0 1px 3px rgba(23, 32, 43, 0.2);
}
.error { width: 100%; font-size: 13px; font-weight: 600; color: var(--red-ink); }
.full { display: block; max-width: 100%; max-height: 70vh; margin: 0 auto; border-radius: 8px; }
</style>
