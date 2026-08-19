import { computed, reactive, watch } from 'vue'
import type { MusicTrack } from '../../types/music'
import { resolveBuiltinUrl } from '../../services/musicApi'
import { useSourceRuntime } from '../sources/useSourceRuntime'
import { sourceDebug, sourceDebugError } from '../sources/sourceDebug'
import { selectSourceQualities, selectTrackQuality } from './qualityPreference'
import { useLibrary } from '../library/libraryStore'
import { appSettings } from '../settings/appSettings'

const audio = new Audio()
const state = reactive({ current: null as MusicTrack | null, queue: [] as MusicTrack[], playing: false, loading: false, currentTime: 0, duration: 0, volume: appSettings.volume, error: '' })
let customLoadInProgress = false
let fallbackInProgress = false
let playSequence = 0
const isPreviewDuration = (track: MusicTrack) => Number.isFinite(audio.duration) && audio.duration > 0 && track.durationSeconds >= 60 && audio.duration < Math.min(30, track.durationSeconds * 0.5)
const normalizePlaybackUrl = (value: string) => {
  try {
    const url = new URL(value)
    // LX Mobile uses a native player that accepts these HTTP links. WKWebView
    // is more reliable over HTTPS, which the Kuwo media hosts also support.
    if (url.protocol === 'http:' && /(^|\.)kuwo\.cn$/i.test(url.hostname)) url.protocol = 'https:'
    return url.toString()
  } catch { return value }
}
const resetAudioSource = () => { audio.pause(); audio.removeAttribute('src'); audio.load() }
audio.volume = state.volume
watch(() => appSettings.volume, value => { state.volume = value; audio.volume = value })
audio.addEventListener('timeupdate', () => { state.currentTime = audio.currentTime })
audio.addEventListener('durationchange', () => { state.duration = Number.isFinite(audio.duration) ? audio.duration : 0 })
audio.addEventListener('play', () => { state.playing = true })
audio.addEventListener('pause', () => { state.playing = false })
audio.addEventListener('ended', () => void playNext())
audio.addEventListener('error', () => {
  const mediaError = audio.error
  const recoverable = customLoadInProgress || fallbackInProgress
  if (!recoverable) { state.error = '音频加载失败，可以刷新地址或更换自定义源。'; state.loading = false }
  sourceDebugError('player:media-error', { code: mediaError?.code, message: mediaError?.message, currentSrc: audio.currentSrc, networkState: audio.networkState, readyState: audio.readyState, recoverable })
})
async function play(track: MusicTrack, queue?: MusicTrack[]) {
  const playId = ++playSequence
  audio.pause()
  state.loading = true; state.error = ''; state.current = track; if (queue) state.queue = queue
  const runtime = useSourceRuntime()
  const hasCustomSource = runtime.activeSourceId.value !== null
  const sourceQualities = selectSourceQualities(quality => runtime.canResolve(track.source, quality))
  const quality = sourceQualities[0] ?? selectTrackQuality(track)
  sourceDebug('player:quality', { trackQualities: track.qualities, sourceQualities: runtime.capabilities.value?.sources?.[track.source]?.qualitys, candidates: sourceQualities, selected: quality })
  try {
    if (hasCustomSource && runtime.status.value !== 'ready') {
      const detail = runtime.error.value || (runtime.status.value === 'loading' ? '音源仍在初始化' : '音源未完成初始化')
      throw new Error(`自定义源「${runtime.sourceName.value}」不可用：${detail}`)
    }
    if (hasCustomSource && !sourceQualities.length) throw new Error(`自定义源「${runtime.sourceName.value}」不支持 ${track.source} 或当前歌曲音质`)
    let playError: unknown = null
    if (sourceQualities.length) {
      customLoadInProgress = true
      for (const candidate of sourceQualities) {
        try {
          const rawUrl = await runtime.resolveMusicUrl(track, candidate)
          if (playId !== playSequence) { customLoadInProgress = false; sourceDebug('player:stale-request', { playId, track: { id: track.id, name: track.name }, stage: 'url-resolved' }); return }
          const url = normalizePlaybackUrl(rawUrl)
          sourceDebug('player:load', { track: { id: track.id, source: track.source, name: track.name }, quality: candidate, customSource: runtime.sourceName.value, url, normalizedFrom: url === rawUrl ? null : rawUrl })
          resetAudioSource(); audio.src = url; await audio.play()
          customLoadInProgress = false; state.error = ''; useLibrary().recordRecent(track)
          sourceDebug('player:custom-playing', { track: { id: track.id, source: track.source, name: track.name }, quality: candidate, currentSrc: audio.currentSrc })
          return
        } catch (error) {
          playError = error
          sourceDebugError('player:custom-quality-unusable', { sourceName: runtime.sourceName.value, track: { id: track.id, name: track.name }, quality: candidate, mediaErrorCode: audio.error?.code, error })
        }
      }
      customLoadInProgress = false
      const canFallback = appSettings.fallbackToBuiltin
      if (!canFallback) throw playError
      if (playId !== playSequence) { sourceDebug('player:stale-request', { playId, track: { id: track.id, name: track.name }, stage: 'custom-url-failed' }); return }
      sourceDebugError('player:custom-url-unusable', { sourceName: runtime.sourceName.value, attemptedQualities: sourceQualities, mediaErrorCode: audio.error?.code, error: playError })
      fallbackInProgress = true
      resetAudioSource(); state.error = ''
      const fallbackUrl = await resolveBuiltinUrl(track, quality)
      if (playId !== playSequence) { fallbackInProgress = false; sourceDebug('player:stale-request', { playId, track: { id: track.id, name: track.name }, stage: 'fallback-resolved' }); return }
      sourceDebug('player:builtin-fallback', { reason: 'custom source returned an unloadable URL', track: { id: track.id, source: track.source, name: track.name }, quality, url: fallbackUrl })
      audio.src = fallbackUrl; await audio.play()
      if (isPreviewDuration(track)) {
        const previewSeconds = Math.round(audio.duration)
        sourceDebugError('player:fallback-preview', { track: { id: track.id, name: track.name, expectedSeconds: track.durationSeconds }, previewSeconds, url: fallbackUrl })
        audio.pause(); audio.removeAttribute('src'); audio.load()
        throw new Error(`自定义源返回的地址已失效，内置解析仅返回 ${previewSeconds} 秒试听片段`)
      }
      fallbackInProgress = false; state.error = ''
      useLibrary().recordRecent(track)
      sourceDebug('player:fallback-playing', { track: { id: track.id, source: track.source, name: track.name }, currentSrc: audio.currentSrc, readyState: audio.readyState })
    } else {
      const url = await resolveBuiltinUrl(track, quality)
      if (playId !== playSequence) return
      sourceDebug('player:load', { track: { id: track.id, source: track.source, name: track.name }, quality, customSource: null, url })
      audio.src = url; await audio.play(); useLibrary().recordRecent(track)
    }
  }
  catch (error) { customLoadInProgress = false; fallbackInProgress = false; if (playId === playSequence) { state.error = error instanceof Error ? error.message : String(error); sourceDebugError('player:failed', { message: state.error, error }) } }
  finally { if (playId === playSequence) state.loading = false }
}
async function toggle() { if (!state.current) return; if (audio.paused) await audio.play(); else audio.pause() }
async function playNext() { if (!state.current) return; const index = state.queue.findIndex(t => t.id === state.current?.id && t.source === state.current?.source); const next = state.queue[index + 1]; if (next) await play(next) }
function seek(seconds: number) { audio.currentTime = seconds }
function setVolume(value: number) { state.volume = value; audio.volume = value; appSettings.volume = value }
export function usePlayer() { return { state, progress: computed(() => state.duration ? state.currentTime / state.duration : 0), play, toggle, playNext, seek, setVolume } }
