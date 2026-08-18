import { invoke } from '@tauri-apps/api/core'
import { computed, ref } from 'vue'
import type { MusicTrack, Quality, SourceCapabilities } from '../../types/music'
import { createSourceDocument } from './sourceFrame'

const sourceName = ref(localStorage.getItem('rubia.source.name') || '内置解析')
const capabilities = ref<SourceCapabilities | null>(null)
const status = ref<'idle' | 'loading' | 'ready' | 'error'>('idle')
const error = ref('')
let frame: HTMLIFrameElement | null = null
let sequence = 0
const requests = new Map<string, { resolve: (value: string) => void; reject: (reason: unknown) => void; timer: number }>()

const formatDuration = (seconds: number) => `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`
const legacyMusicInfo = (track: MusicTrack) => ({ id: `${track.source}_${track.id}`, name: track.name, singer: track.artist, source: track.source, interval: formatDuration(track.durationSeconds), ...track.sourceData })
const send = (type: string, data: unknown) => frame?.contentWindow?.postMessage({ channel: 'rubia-host', type, data }, '*')

window.addEventListener('message', async ({ data, source }) => {
  if (!frame || source !== frame.contentWindow || data?.channel !== 'rubia-source') return
  if (data.type === 'inited') { capabilities.value = data.data; status.value = 'ready'; return }
  if (data.type === 'init-error') { status.value = 'error'; error.value = data.data.message; return }
  if (data.type === 'source-response') {
    const pending = requests.get(data.data.id); if (!pending) return
    clearTimeout(pending.timer); requests.delete(data.data.id)
    data.data.error ? pending.reject(new Error(data.data.error)) : pending.resolve(data.data.result)
    return
  }
  if (data.type === 'http-request') {
    const { id, url, options } = data.data
    const body = options.body ?? (options.form ? new URLSearchParams(options.form).toString() : undefined)
    try {
      const response = await invoke('source_http_request', { request: { url, method: options.method || 'GET', headers: options.headers || {}, body, timeoutMs: options.timeout } })
      send('http-response', { id, response })
    } catch (requestError) { send('http-response', { id, error: String(requestError) }) }
  }
})

function loadSource(script: string, name = '自定义源') {
  frame?.remove(); status.value = 'loading'; error.value = ''; capabilities.value = null
  frame = document.createElement('iframe'); frame.sandbox.add('allow-scripts'); frame.hidden = true; frame.srcdoc = createSourceDocument(script); document.body.appendChild(frame)
  sourceName.value = name; localStorage.setItem('rubia.source.name', name); localStorage.setItem('rubia.source.script', script)
}
function canResolve(source: string, quality: Quality) { const info = capabilities.value?.sources?.[source]; return status.value === 'ready' && !!info?.actions.includes('musicUrl') && info.qualitys.includes(quality) }
function resolveMusicUrl(track: MusicTrack, quality: Quality) {
  const id = `request_${++sequence}`
  return new Promise<string>((resolve, reject) => {
    const timer = window.setTimeout(() => { requests.delete(id); reject(new Error('自定义源请求超时')) }, 20_000)
    requests.set(id, { resolve, reject, timer }); send('source-request', { id, request: { source: track.source, action: 'musicUrl', info: { type: quality, musicInfo: legacyMusicInfo(track) } } })
  }).then(url => { if (typeof url !== 'string' || url.length > 2048 || !/^https?:/.test(url)) throw new Error('自定义源返回了无效地址'); return url })
}
const savedScript = localStorage.getItem('rubia.source.script')
if (savedScript) queueMicrotask(() => loadSource(savedScript, sourceName.value))
export function useSourceRuntime() { return { sourceName: computed(() => sourceName.value), capabilities, status, error, loadSource, canResolve, resolveMusicUrl } }
