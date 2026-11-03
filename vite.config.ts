import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// Relative base so the page works under any GitHub Pages path.
export default defineConfig({
  base: './',
  plugins: [vue()],
  // With VITE_API_URL=/api in .env.local the dev server talks to the local backend (server/, port 3000).
  server: { proxy: { '/api': 'http://localhost:3000' } },
})
