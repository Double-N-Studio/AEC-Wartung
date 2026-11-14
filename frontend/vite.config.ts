import { cpSync, createReadStream, existsSync, statSync, writeFileSync } from 'node:fs'
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

/**
 * Every build gets an id: compiled into the app (__BUILD_ID__) and written to version.json next to index.html.
 * An open page compares the two and reloads when a newer build is deployed (src/update.ts).
 */
function buildVersion(): Plugin {
  const build = Date.now().toString(36)
  let outDir = 'dist'
  return {
    name: 'build-version',
    config: () => ({ define: { __BUILD_ID__: JSON.stringify(build) } }),
    configResolved(config) { outDir = resolve(config.root, config.build.outDir) },
    writeBundle() { writeFileSync(join(outDir, 'version.json'), JSON.stringify({ build })) },
  }
}

// Relative base so the page works under any GitHub Pages path.
export default defineConfig({
  base: './',
  plugins: [vue(), pdfjsAssets(), buildVersion()],
  // With VITE_API_URL=/api in .env.local the dev server talks to the local backend (backend/, port 3000).
  server: { proxy: { '/api': 'http://localhost:3000' } },
})
