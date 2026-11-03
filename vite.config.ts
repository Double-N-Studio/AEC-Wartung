import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// Relative base, damit die Seite unter jedem GitHub-Pages-Pfad funktioniert.
export default defineConfig({
  base: './',
  plugins: [vue()],
  // Mit VITE_API_URL=/api in .env.local spricht der Entwicklungsserver mit dem lokalen Backend (server/, Port 3000).
  server: { proxy: { '/api': 'http://localhost:3000' } },
})
