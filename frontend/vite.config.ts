import { cpSync, createReadStream, existsSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { defineConfig, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'

/**
 * pdf.js needs extra files at runtime to draw every PDF: wasm decoders for scanned pages (JBIG2, JPEG 2000),
 * standard fonts, character maps and ICC profiles. They are served under pdfjs/ (utils/pdfPreview.ts).
 */
const PDFJS = resolve('node_modules/pdfjs-dist')
const PDFJS_DIRS = ['wasm', 'standard_fonts', 'cmaps', 'iccs']
function pdfjsAssets(): Plugin {
  let outDir = 'dist'
  return {
    name: 'pdfjs-assets',
    configResolved(config) { outDir = resolve(config.root, config.build.outDir) },
    configureServer(server) {
      server.middlewares.use('/pdfjs', (req, res, next) => {
        const path = join(PDFJS, decodeURIComponent((req.url ?? '').split('?')[0]!))
        if (!path.startsWith(PDFJS) || !existsSync(path) || !statSync(path).isFile()) return next()
        if (path.endsWith('.wasm')) res.setHeader('Content-Type', 'application/wasm')
        createReadStream(path).pipe(res)
      })
    },
    writeBundle() {
      for (const dir of PDFJS_DIRS) cpSync(join(PDFJS, dir), join(outDir, 'pdfjs', dir), { recursive: true })
    },
  }
}

// Relative base so the page works under any GitHub Pages path.
export default defineConfig({
  base: './',
  plugins: [vue(), pdfjsAssets()],
  // With VITE_API_URL=/api in .env.local the dev server talks to the local backend (backend/, port 3000).
  server: { proxy: { '/api': 'http://localhost:3000' } },
})
