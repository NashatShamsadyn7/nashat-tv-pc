import { session } from 'electron'

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'

const VLC_UA = 'VLC/3.0.18 LibVLC/3.0.18'

// Hosts whose CDNs hotlink-protect their streams: the manifest and every
// segment are served only to a request carrying the broadcaster's own Referer.
// Must stay an exact-host / true-subdomain list. An earlier version matched any
// hostname *containing* 'hls' or 'stream', which forged a karwan.tv Referer
// onto unrelated CDNs (akamaized.net, streamlock.net, wns.live, persiana.live…).
// Sending a foreign Referer to those leaks the association and trips hotlink
// protection, which rejects the segment request outright — so each host is
// paired with the one Referer its own CDN whitelists.
//
// stream.kurdmax.tv accepts `https://kurdmax.tv` (and www) and nothing else:
// no Referer, a VLC/ExoPlayer User-Agent, or an Origin header alone all 403.
const REFERER_BY_HOST: Record<string, string> = {
  'karwan.tv': 'https://karwan.tv/',
  'stream.kurdmax.tv': 'https://kurdmax.tv/'
}

function isStreamSegment(url: string): boolean {
  return /\.(m3u8|ts|mpd|m4s|key)(\?|$)/i.test(url)
}

function refererFor(url: string): string | null {
  if (!isStreamSegment(url)) return null
  try {
    const host = new URL(url).hostname.toLowerCase()
    for (const [pattern, referer] of Object.entries(REFERER_BY_HOST)) {
      if (host === pattern || host.endsWith('.' + pattern)) return referer
    }
    return null
  } catch {
    return null
  }
}

function isIptvRequest(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase()
    return host.includes('cloudenginerevo')
  } catch {
    return false
  }
}

export function installStreamHeaders(): void {
  session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
    const headers = { ...details.requestHeaders }

    if (isIptvRequest(details.url)) {
      headers['User-Agent'] = VLC_UA
      delete headers['Referer']
      delete headers['Origin']
      callback({ requestHeaders: headers })
      return
    }

    const referer = refererFor(details.url)
    if (!referer) {
      callback({ requestHeaders: details.requestHeaders })
      return
    }

    headers['Referer'] = referer
    headers['Origin'] = referer.replace(/\/$/, '')
    headers['User-Agent'] = UA
    callback({ requestHeaders: headers })
  })
}
