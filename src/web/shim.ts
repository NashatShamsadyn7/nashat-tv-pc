// Browser stand-in for the `window.nashat` bridge that src/preload exposes in
// the desktop build. Desktop-only features (updater, tray, PiP, media keys,
// stream extraction) become no-ops or rejections so the shared renderer code
// falls through to its existing error paths.
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth'
import { auth } from '@/services/firebase'
import type { TmdbInvokePayload } from '@shared/tmdb'

declare const __APP_VERSION__: string

// TMDB is reached through the `tmdb` Cloud Function (functions/index.js),
// which holds the bearer token; Hosting rewrites /tmdb/** to it.
const TMDB_BASE = `${location.origin}/tmdb`
const TTL_MS = 5 * 60 * 1000
const cache = new Map<string, { expiresAt: number; data: unknown }>()

async function tmdbGet<T = unknown>(payload: TmdbInvokePayload): Promise<T> {
  const url = new URL(`${TMDB_BASE}${payload.endpoint}`)
  for (const [k, v] of Object.entries(payload.params ?? {})) url.searchParams.set(k, String(v))
  url.searchParams.sort()
  const key = url.toString()
  const now = Date.now()
  const hit = cache.get(key)
  if (hit && hit.expiresAt > now) return hit.data as T

  const res = await fetch(key, { headers: { accept: 'application/json' } })
  if (!res.ok) throw new Error(`TMDB ${payload.endpoint} → HTTP ${res.status}`)
  const data = await res.json()
  cache.set(key, { data, expiresAt: now + TTL_MS })
  return data as T
}

async function googleSignIn(): Promise<{ idToken: string; accessToken: string }> {
  const result = await signInWithPopup(auth, new GoogleAuthProvider())
  const cred = GoogleAuthProvider.credentialFromResult(result)
  if (!cred?.idToken) throw new Error('Google sign-in returned no credential')
  return { idToken: cred.idToken, accessToken: cred.accessToken ?? '' }
}

const unsupported = () => Promise.reject(new Error('Not available in the web version'))
const noop = async () => {}

;(window as unknown as { nashat: unknown }).nashat = {
  platform: 'web',
  versions: { node: '', chrome: '', electron: '' },
  tmdbGet,
  extractStream: unsupported,
  probeStreamServer: unsupported,
  googleSignIn,
  onUpdateEvent: () => () => {},
  installUpdate: noop,
  openPip: noop,
  closePip: noop,
  getAppVersion: async () => `web ${__APP_VERSION__}`,
  openExternal: async (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer')
    return true
  },
  showTray: noop,
  setPresence: noop,
  onMediaKey: () => () => {}
}
