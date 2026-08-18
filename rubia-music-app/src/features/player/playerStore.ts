import { computed, reactive } from 'vue'
import type { MusicTrack, Quality } from '../../types/music'
import { resolveBuiltinUrl } from '../../services/musicApi'
import { useSourceRuntime } from '../sources/useSourceRuntime'

const audio = new Audio()
const state = reactive({ current: null as MusicTrack | null, queue: [] as MusicTrack[], playing: false, loading: false, currentTime: 0, duration: 0, volume: 0.82, error: '' })
audio.volume = state.volume
audio.addEventListener('timeupdate', () => { state.currentTime = audio.currentTime })
audio.addEventListener('durationchange', () => { state.duration = Number.isFinite(audio.duration) ? audio.duration : 0 })
audio.addEventListener('play', () => { state.playing = true })
audio.addEventListener('pause', () => { state.playing = false })
audio.addEventListener('ended', () => void playNext())
audio.addEventListener('error', () => { state.error = '音频加载失败，可以刷新地址或更换自定义源。'; state.loading = false })
function preferredQuality(track: MusicTrack): Quality { return (['flac24bit', 'flac', '320k', '128k'] as Quality[]).find(q => track.qualities.includes(q)) ?? '128k' }
async function play(track: MusicTrack, queue?: MusicTrack[]) {
  state.loading = true; state.error = ''; state.current = track; if (queue) state.queue = queue
  const runtime = useSourceRuntime()
  const sourceQuality = (['flac24bit', 'flac', '320k', '128k'] as Quality[]).find(quality => track.qualities.includes(quality) && runtime.canResolve(track.source, quality))
  const quality = sourceQuality ?? preferredQuality(track)
  try { const url = sourceQuality ? await runtime.resolveMusicUrl(track, sourceQuality) : await resolveBuiltinUrl(track, quality); audio.src = url; await audio.play() }
  catch (error) { state.error = error instanceof Error ? error.message : String(error) }
  finally { state.loading = false }
}
async function toggle() { if (!state.current) return; if (audio.paused) await audio.play(); else audio.pause() }
async function playNext() { if (!state.current) return; const index = state.queue.findIndex(t => t.id === state.current?.id && t.source === state.current?.source); const next = state.queue[index + 1]; if (next) await play(next) }
function seek(seconds: number) { audio.currentTime = seconds }
function setVolume(value: number) { state.volume = value; audio.volume = value }
export function usePlayer() { return { state, progress: computed(() => state.duration ? state.currentTime / state.duration : 0), play, toggle, playNext, seek, setVolume } }
