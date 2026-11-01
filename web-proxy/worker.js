// TMDB read proxy for the web build (nashat-tv-watch.web.app). The bearer
// token lives only in this Worker's secrets (`wrangler secret put
// TMDB_V4_TOKEN`), so the public bundle never carries it.
const TMDB_BASE = 'https://api.themoviedb.org/3'
const ALLOWED_ORIGINS = ['https://nashat-tv-watch.web.app', 'https://nashat-tv-watch.firebaseapp.com']
const ALLOWED_PATHS = /^\/(movie|tv|trending|search|discover|person|genre|configuration|collection)(\/|$)/

function cors(origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin) || /^http:\/\/localhost:\d+$/.test(origin)
  return allowed
    ? { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Methods': 'GET', Vary: 'Origin' }
    : null
}

export default {
  async fetch(request, env, ctx) {
    const origin = request.headers.get('Origin') ?? ''
    const headers = cors(origin)
    if (!headers) return new Response('Forbidden', { status: 403 })
    if (request.method === 'OPTIONS') return new Response(null, { headers })
    if (request.method !== 'GET') return new Response('Method not allowed', { status: 405, headers })

    const url = new URL(request.url)
    const path = url.pathname.replace(/^\/3/, '')
    if (!ALLOWED_PATHS.test(path)) return new Response('Not found', { status: 404, headers })

    const target = `${TMDB_BASE}${path}${url.search}`
    const cache = caches.default
    const cacheKey = new Request(target)
    let res = await cache.match(cacheKey)
    if (!res) {
      const upstream = await fetch(target, {
        headers: { accept: 'application/json', authorization: `Bearer ${env.TMDB_V4_TOKEN}` }
      })
      res = new Response(upstream.body, upstream)
      res.headers.set('Cache-Control', 'public, max-age=300')
      if (upstream.ok) ctx.waitUntil(cache.put(cacheKey, res.clone()))
    }
    const out = new Response(res.body, res)
    for (const [k, v] of Object.entries(headers)) out.headers.set(k, v)
    return out
  }
}
