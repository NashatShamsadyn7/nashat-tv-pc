// Web replacement for MoviePlayerModal. The desktop build plays titles through
// third-party embed servers; the web build does not. Instead the Play buttons
// open this sheet: the official trailer from YouTube plus the licensed
// services that stream the title in the viewer's country (TMDB watch
// providers, sourced from JustWatch).
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { ExternalLink, Film, X } from 'lucide-react'
import type { TmdbMediaSource } from '@/stores/playerStore'
import { tmdbRegion } from '@/i18n/tmdbLocale'
import { youtubeEmbedUrl, type TmdbVideo } from '@shared/tmdb'

type Provider = { provider_id: number; provider_name: string; logo_path: string | null }
type CountryProviders = {
  link?: string
  flatrate?: Provider[]
  free?: Provider[]
  ads?: Provider[]
  rent?: Provider[]
  buy?: Provider[]
}

const COPY = {
  en: {
    whereToWatch: 'Where to watch',
    stream: 'Stream',
    free: 'Free',
    rent: 'Rent',
    buy: 'Buy',
    none: 'No streaming service lists this title in your country yet.',
    noTrailer: 'No trailer available',
    allOptions: 'All options',
    episode: (s: number, e: number) => `Season ${s} · Episode ${e}`
  },
  ar: {
    whereToWatch: 'أين تشاهده',
    stream: 'اشتراك',
    free: 'مجاني',
    rent: 'استئجار',
    buy: 'شراء',
    none: 'لا توجد منصة تعرض هذا العمل في بلدك حالياً.',
    noTrailer: 'لا يوجد تريلر',
    allOptions: 'كل الخيارات',
    episode: (s: number, e: number) => `الموسم ${s} · الحلقة ${e}`
  },
  ku: {
    whereToWatch: 'لە کوێ سەیری بکەیت',
    stream: 'بەشداربوون',
    free: 'بەخۆڕایی',
    rent: 'بەکرێ',
    buy: 'کڕین',
    none: 'هیچ پلاتفۆرمێک ئەم بەرهەمە لە وڵاتەکەت پیشان نادات.',
    noTrailer: 'ترەیلەر نییە',
    allOptions: 'هەموو هەڵبژاردنەکان',
    episode: (s: number, e: number) => `وەرزی ${s} · ئەڵقەی ${e}`
  }
} as const

function pickTrailer(videos: TmdbVideo[] | undefined): TmdbVideo | null {
  const youtube = (videos ?? []).filter((v) => v.site === 'YouTube')
  return (
    youtube.find((v) => v.type === 'Trailer' && v.official) ??
    youtube.find((v) => v.type === 'Trailer') ??
    youtube.find((v) => v.type === 'Teaser') ??
    youtube[0] ??
    null
  )
}

function ProviderRow({ label, items }: { label: string; items?: Provider[] }) {
  if (!items || items.length === 0) return null
  return (
    <div className="mt-4">
      <p className="text-xs uppercase tracking-wide text-white/50 mb-2">{label}</p>
      <div className="flex flex-wrap gap-2">
        {items.map((p) => (
          <div
            key={p.provider_id}
            className="flex items-center gap-2 rounded-xl bg-white/5 ring-1 ring-white/10 pe-3"
            title={p.provider_name}
          >
            {p.logo_path && (
              <img
                src={`https://image.tmdb.org/t/p/w92${p.logo_path}`}
                alt=""
                className="w-9 h-9 rounded-xl"
                loading="lazy"
              />
            )}
            <span className="text-sm">{p.provider_name}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function WebTitleModal({
  source,
  onClose
}: {
  source: TmdbMediaSource | null
  onClose: () => void
}) {
  const { i18n } = useTranslation()
  const copy = COPY[(i18n.language as keyof typeof COPY) ?? 'en'] ?? COPY.en
  const [trailer, setTrailer] = useState<TmdbVideo | null | undefined>(undefined)
  const [providers, setProviders] = useState<CountryProviders | null | undefined>(undefined)

  useEffect(() => {
    if (!source) return
    setTrailer(undefined)
    setProviders(undefined)
    const base = `/${source.kind}/${source.tmdbId}`
    // English videos as a fallback: most titles only carry an English trailer.
    window.nashat
      .tmdbGet<{ results: TmdbVideo[] }>({
        endpoint: `${base}/videos`,
        params: { include_video_language: `${i18n.language},en,null` }
      })
      .then((r) => setTrailer(pickTrailer(r.results)))
      .catch(() => setTrailer(null))
    window.nashat
      .tmdbGet<{ results: Record<string, CountryProviders> }>({ endpoint: `${base}/watch/providers` })
      .then((r) => setProviders(r.results[tmdbRegion()] ?? r.results.US ?? null))
      .catch(() => setProviders(null))
  }, [source, i18n.language])

  useEffect(() => {
    if (!source) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [source, onClose])

  if (!source) return null

  const hasProviders =
    !!providers &&
    [providers.flatrate, providers.free, providers.ads, providers.rent, providers.buy].some(
      (l) => l && l.length > 0
    )

  return createPortal(
    <div
      className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm overflow-y-auto p-4 sm:p-8"
      onClick={onClose}
    >
      <div
        className="mx-auto w-full max-w-4xl rounded-2xl overflow-hidden ring-1 ring-ink-600/40 bg-ink-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 p-4 sm:p-5">
          <div className="min-w-0">
            <h2 className="text-lg sm:text-xl font-bold truncate">{source.title}</h2>
            {source.kind === 'tv' && source.season != null && source.episode != null && (
              <p className="text-sm text-white/60">{copy.episode(source.season, source.episode)}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="shrink-0 rounded-full p-2 bg-white/5 hover:bg-white/10"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="aspect-video bg-black grid place-items-center">
          {trailer ? (
            <iframe
              src={youtubeEmbedUrl(trailer.key, true)}
              title={trailer.name}
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
              allowFullScreen
              className="w-full h-full"
            />
          ) : trailer === null ? (
            <div className="flex flex-col items-center gap-2 text-white/50">
              <Film className="w-10 h-10" />
              <span className="text-sm">{copy.noTrailer}</span>
            </div>
          ) : (
            <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-white animate-spin" />
          )}
        </div>

        <div className="p-4 sm:p-5">
          <div className="flex items-center justify-between gap-4">
            <h3 className="font-bold">{copy.whereToWatch}</h3>
            {providers?.link && (
              <a
                href={providers.link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-sky-300 hover:underline"
              >
                {copy.allOptions}
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
          {providers === undefined ? (
            <div className="mt-4 h-9 w-48 rounded-xl bg-white/5 animate-pulse" />
          ) : hasProviders ? (
            <>
              <ProviderRow label={copy.stream} items={providers!.flatrate} />
              <ProviderRow label={copy.free} items={[...(providers!.free ?? []), ...(providers!.ads ?? [])]} />
              <ProviderRow label={copy.rent} items={providers!.rent} />
              <ProviderRow label={copy.buy} items={providers!.buy} />
            </>
          ) : (
            <p className="mt-3 text-sm text-white/60">{copy.none}</p>
          )}
          <p className="mt-5 text-[11px] text-white/40">Streaming data: JustWatch via TMDB</p>
        </div>
      </div>
    </div>,
    document.body
  )
}
