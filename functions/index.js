// TMDB read proxy for the web build (nashat-tv-watch.web.app). Hosting rewrites
// /tmdb/** here, so the bearer token stays in Secret Manager
// (`firebase functions:secrets:set TMDB_V4_TOKEN`) and never ships to browsers.
const { onRequest } = require('firebase-functions/v2/https')
const { defineSecret } = require('firebase-functions/params')

const TMDB_V4_TOKEN = defineSecret('TMDB_V4_TOKEN')
const TMDB_BASE = 'https://api.themoviedb.org/3'
const ALLOWED_PATHS = /^\/(movie|tv|trending|search|discover|person|genre|configuration|collection)(\/|$)/

exports.tmdb = onRequest(
  { region: 'us-central1', secrets: [TMDB_V4_TOKEN], maxInstances: 5, memory: '256MiB' },
  async (req, res) => {
    if (req.method !== 'GET') {
      res.status(405).send('Method not allowed')
      return
    }
    const path = req.path.replace(/^\/tmdb/, '')
    if (!ALLOWED_PATHS.test(path)) {
      res.status(404).send('Not found')
      return
    }
    const query = req.originalUrl.includes('?') ? req.originalUrl.slice(req.originalUrl.indexOf('?')) : ''
    const upstream = await fetch(`${TMDB_BASE}${path}${query}`, {
      headers: { accept: 'application/json', authorization: `Bearer ${TMDB_V4_TOKEN.value()}` }
    })
    // Hosting's CDN caches successful answers, so repeat views skip the function.
    res.set('Cache-Control', upstream.ok ? 'public, max-age=300, s-maxage=600' : 'no-store')
    res.status(upstream.status).type('application/json').send(await upstream.text())
  }
)
