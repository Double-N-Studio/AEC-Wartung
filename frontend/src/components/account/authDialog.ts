import { ref } from 'vue'

/** Which account popup is open; opened from the sidebar, the notice bar or on the first visit. */
export const authDialog = ref<'name' | 'login' | null>(null)
