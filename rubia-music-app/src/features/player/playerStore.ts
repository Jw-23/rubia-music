import { computed, reactive } from 'vue'
import type { MusicTrack } from '../../types/music'
import { resolveBuiltinUrl } from '../../services/musicApi'
import { useSourceRuntime } from '../sources/useSourceRuntime'
import { sourceDebug, sourceDebugError } from '../sources/sourceDebug'
import { selectSourceQuality, selectTrackQuality } from './qualityPreference'

const audio = new Audio()
const state = reactive({ current: null as MusicTrack | null, queue: [] as MusicTrack[], playing: false, loading: false, currentTime: 0, duration: 0, volume: 0.82, error: '' })
audio.volume = state.volume
audio.addEventListener('timeupdate', () => { state.currentTime = audio.currentTime })
audio.addEventListener('durationchange', () => { state.duration = Number.isFinite(audio.duration) ? audio.duration : 0 })
audio.addEventListener('play', () => { state.playing = true })
audio.addEventListener('pause', () => { state.playing = false })
audio.addEventListener('ended', () => void playNext())
audio.addEventListener('error', () => {
  const mediaError = audio.error
  state.error = '音频加载失败，可以刷新地址或更换自定义源。'; state.loading = false
  sourceDebugError('player:media-error', { code: mediaError?.code, message: mediaError?.message, currentSrc: audio.currentSrc, networkState: audio.networkState, readyState: audio.readyState })
})
async function play(track: MusicTrack, queue?: MusicTrack[]) {
  state.loading = true; state.error = ''; state.current = track; if (queue) state.queue = queue
  const runtime = useSourceRuntime()
  const hasCustomSource = runtime.activeSourceId.value !== null
  const sourceQuality = selectSourceQuality(quality => runtime.canResolve(track.source, quality))
  const quality = sourceQuality ?? selectTrackQuality(track)
  sourceDebug('player:quality', { trackQualities: track.qualities, sourceQualities: runtime.capabilities.value?.sources?.[track.source]?.qualitys, selected: quality })
  try {
    if (hasCustomSource && runtime.status.value !== 'ready') {
      const detail = runtime.error.value || (runtime.status.value === 'loading' ? '音源仍在初始化' : '音源未完成初始化')
      throw new Error(`自定义源「${runtime.sourceName.value}」不可用：${detail}`)
    }
    if (hasCustomSource && !sourceQuality) throw new Error(`自定义源「${runtime.sourceName.value}」不支持 ${track.source} 或当前歌曲音质`)
    const url = sourceQuality ? await runtime.resolveMusicUrl(track, sourceQuality) : await resolveBuiltinUrl(track, quality)
    sourceDebug('player:load', { track: { id: track.id, source: track.source, name: track.name }, quality, customSource: sourceQuality ? runtime.sourceName.value : null, url })
    audio.src = url; await audio.play()
  }
  catch (error) { state.error = error instanceof Error ? error.message : String(error); sourceDebugError('player:failed', { message: state.error, error }) }
  finally { state.loading = false }
}
async function toggle() { if (!state.current) return; if (audio.paused) await audio.play(); else audio.pause() }
async function playNext() { if (!state.current) return; const index = state.queue.findIndex(t => t.id === state.current?.id && t.source === state.current?.source); const next = state.queue[index + 1]; if (next) await play(next) }
function seek(seconds: number) { audio.currentTime = seconds }
function setVolume(value: number) { state.volume = value; audio.volume = value }
export function usePlayer() { return { state, progress: computed(() => state.duration ? state.currentTime / state.duration : 0), play, toggle, playNext, seek, setVolume } }
