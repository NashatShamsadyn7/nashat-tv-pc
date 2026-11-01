import { resolve } from 'node:path'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import pkg from './package.json'

// Browser build of the renderer for Firebase Hosting (site nashat-tv-watch).
// src/web/shim.ts stands in for the Electron preload bridge (TMDB goes through
// the web-proxy Worker so no token ships in the bundle), and the embed-
// server player is swapped for a trailer + where-to-watch sheet.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  if (mode === 'production' && !env.VITE_TMDB_PROXY_URL?.trim()) {
    throw new Error('Refusing to build: VITE_TMDB_PROXY_URL (the web-proxy Worker URL) is missing from .env')
  }
  return {
    root: 'src/web',
    base: '/',
    envDir: resolve('.'),
    plugins: [react()],
    define: {
      __APP_VERSION__: JSON.stringify(pkg.version),
      // The desktop build ships these; a public site must not, since the ImgBB
      // key uploads into the owner's account. Both features show their own
      // "not configured" state when the key is empty.
      'import.meta.env.VITE_IMGBB_API_KEY': '""',
      'import.meta.env.VITE_GIPHY_API_KEY': '""'
    },
    resolve: {
      alias: [
        { find: /^@\/components\/player\/MoviePlayerModal$/, replacement: resolve('src/web/WebTitleModal.tsx') },
        { find: '@shared', replacement: resolve('src/shared') },
        { find: '@', replacement: resolve('src/renderer/src') }
      ]
    },
    build: {
      outDir: resolve('out/web'),
      emptyOutDir: true
    }
  }
})
