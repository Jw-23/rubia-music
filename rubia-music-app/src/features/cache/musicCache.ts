import { computed, reactive } from 'vue'
import { convertFileSrc, invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import type { MusicTrack, Quality } from '../../types/music'
import { resolveBuiltinUrl } from '../../services/musicApi'
import { appSettings } from '../settings/appSettings'
import { useSourceRuntime } from '../sources/useSourceRuntime'
import { selectSourceQualities, selectTrackQuality } from '../player/qualityPreference'

export type CacheRecord = { path: string; bytes: number; savedAt: number; track?: MusicTrack }
const storageKey = 'rubia.music.cache-index.v1'
const readIndex = () => {
  try { return JSON.parse(localStorage.getItem(storageKey) || '{}') as Record<string, CacheRecord> }
  catch { return {} }
}
const state = reactive({ records: readIndex(), downloading: {} as Record<string, number>, activeTracks: {} as Record<string, MusicTrack>, errors: {} as Record<string, string> })
const keyOf = (track: MusicTrack) => `${track.source}:${track.id}`
const persist = () => localStorage.setItem(storageKey, JSON.stringify(state.records))
void listen<{ trackKey: string; percent: number }>('rubia://download-progress', ({ payload }) => {
  if (state.downloading[payload.trackKey] !== undefined) state.downloading[payload.trackKey] = payload.percent
})

async function resolveDownloadUrl(track: MusicTrack): Promise<{ url: string; quality: Quality }> {
  const runtime = useSourceRuntime()
  const candidates = selectSourceQualities(quality => runtime.canResolve(track.source, quality))
  const quality = candidates[0] ?? selectTrackQuality(track)
  if (runtime.activeSourceId.value !== null && runtime.status.value === 'ready') {
    for (const candidate of candidates) {
      try { return { url: await runtime.resolveMusicUrl(track, candidate), quality: candidate } }
      catch { /* try the next supported quality */ }
    }
    if (!appSettings.fallbackToBuiltin) throw new Error(`音源「${runtime.sourceName.value}」无法解析这首歌曲`)
  }
  return { url: await resolveBuiltinUrl(track, quality), quality }
}

export async function cachedPlaybackUrl(track: MusicTrack) {
  const key = keyOf(track)
  try {
    const path = await invoke<string | null>('cached_track_path', { trackKey: key })
    if (!path) { if (state.records[key]) { delete state.records[key]; persist() }; return null }
    if (!state.records[key]) { state.records[key] = { path, bytes: 0, savedAt: Date.now(), track }; persist() }
    return convertFileSrc(path)
  } catch { return null }
}

export async function downloadTrack(track: MusicTrack) {
  const key = keyOf(track)
  if (state.downloading[key] !== undefined) return
  state.downloading[key] = 0; state.activeTracks[key] = track; delete state.errors[key]
  try {
    const { url, quality } = await resolveDownloadUrl(track)
    const record = await invoke<{ path: string; bytes: number }>('cache_track', { url, trackKey: key, quality })
    state.downloading[key] = 100
    state.records[key] = { ...record, savedAt: Date.now(), track }; persist()
  } catch (error) {
    state.errors[key] = error instanceof Error ? error.message : String(error)
    throw error
  } finally { delete state.downloading[key] }
}

export async function downloadTracks(tracks: MusicTrack[], onProgress?: (done: number, total: number) => void) {
  const pending = tracks.filter(track => !state.records[keyOf(track)])
  let done = 0; let failed = 0; onProgress?.(done, pending.length)
  for (const track of pending) {
    try { await downloadTrack(track) } catch { failed += 1 }
    done += 1; onProgress?.(done, pending.length)
  }
  return { downloaded: pending.length - failed, failed }
}

export function useMusicCache() {
  return {
    records: computed(() => state.records), downloading: computed(() => state.downloading), activeTracks: computed(() => state.activeTracks), errors: computed(() => state.errors),
    keyOf, isCached: (track: MusicTrack) => Boolean(state.records[keyOf(track)]), downloadTrack, downloadTracks,
  }
}
