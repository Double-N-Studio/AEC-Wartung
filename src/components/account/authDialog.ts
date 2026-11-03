import { ref } from 'vue'

/** Welches Konto-Popup offen ist; geöffnet aus Seitenleiste, Hinweisleiste oder beim ersten Besuch. */
export const authDialog = ref<'name' | 'login' | null>(null)
