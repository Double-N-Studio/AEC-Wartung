import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// Relative base, damit die Seite unter jedem GitHub-Pages-Pfad funktioniert.
export default defineConfig({
  base: './',
  plugins: [vue()],
})
