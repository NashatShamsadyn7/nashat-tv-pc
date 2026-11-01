import { useEffect, useMemo, useState } from 'react'
import type { Channel } from '@shared/types'
import { subscribeChannels } from './api'
import { filterChannelsForKids, useKidsMode } from '@/features/profiles/useKidsMode'

export type ChannelsState = {
  channels: Channel[]
  loading: boolean
  error: string | null
}

// The first RTDB snapshot waits for the websocket handshake, which can take
// several seconds. Showing the last list immediately keeps Live TV from sitting
// on skeletons; the live subscription replaces it as soon as it arrives.
const CACHE_KEY = 'nashat:live-channels:v1'

function readCache(): Channel[] | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    const parsed = raw ? (JSON.parse(raw) as Channel[]) : null
    return Array.isArray(parsed) && parsed.length ? parsed : null
  } catch {
    return null
  }
}

function writeCache(channels: Channel[]): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(channels))
  } catch {
    /* storage full or unavailable — the live list still works */
  }
}

/** Live subscription to /live_tv_channels in Firebase RTDB. */
export function useChannels(): ChannelsState {
  const [state, setState] = useState<ChannelsState>(() => {
    const cached = readCache()
    return { channels: cached ?? [], loading: !cached, error: null }
  })

  useEffect(() => {
    const unsub = subscribeChannels(
      (channels) => {
        setState({ channels, loading: false, error: null })
        writeCache(channels)
      },
      // Keep showing the cached list if the subscription fails.
      (err) => setState((prev) => ({ channels: prev.channels, loading: false, error: err.message }))
    )
    return () => unsub()
  }, [])

  // Kids profiles only see kid-safe categories. Applied here rather than per
  // page so LiveTV, MultiLive and Search are all covered by one rule.
  const kidsMode = useKidsMode()
  return useMemo(
    () => ({ ...state, channels: filterChannelsForKids(state.channels, kidsMode) }),
    [state, kidsMode]
  )
}
