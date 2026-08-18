import { invoke } from '@tauri-apps/api/core'
import { computed, reactive, ref } from 'vue'
import type { MusicTrack, Quality, SourceCapabilities } from '../../types/music'
import { createSourceDocument } from './sourceFrame'

export interface MusicSourceRecord {
  id: string
  name: string
  description: string
  version: string
  author: string
  homepage: string
  allowShowUpdateAlert: boolean
  script: string
}
interface SourceSettings { sources: MusicSourceRecord[]; activeSourceId: string | null }
interface PendingRequest { resolve: (value: string) => void; reject: (reason: unknown) => void; timer: number }

const sources = ref<MusicSourceRecord[]>([])
const activeSourceId = ref<string | null>(null)
const capabilities = ref<SourceCapabilities | null>(null)
const status = ref<'idle' | 'loading' | 'ready' | 'error'>('idle')
const error = ref('')
const initialized = ref(false)
const updateNotice = reactive({ visible: false, name: '', log: '', updateUrl: '' })
let frame: HTMLIFrameElement | null = null
let sequence = 0
const requests = new Map<string, PendingRequest>()

const activeSource = computed(() => sources.value.find(source => source.id === activeSourceId.value) ?? null)
const sourceName = computed(() => activeSource.value?.name ?? '内置解析')
const formatDuration = (seconds: number) => `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`
const legacyMusicInfo = (track: MusicTrack) => ({ id: `${track.source}_${track.id}`, name: track.name, singer: track.artist, source: track.source, interval: formatDuration(track.durationSeconds), ...track.sourceData })
const send = (type: string, data: unknown) => frame?.contentWindow?.postMessage({ channel: 'rubia-host', type, data }, '*')

function parseScriptInfo(script: string) {
  const header = /^\/\*[\s\S]+?\*\//.exec(script)?.[0]
  if (!header) throw new Error('无效的自定义源文件：文件开头缺少信息注释')
  const limits = { name: 24, description: 36, author: 56, homepage: 1024, version: 36 }
  const info: Record<keyof typeof limits, string> = { name: '', description: '', author: '', homepage: '', version: '' }
  for (const line of header.split(/\r?\n/)) {
    const match = /^\s?\*\s?@(\w+)\s(.+)$/.exec(line)
    const key = match?.[1] as keyof typeof limits
    if (match && key in limits) info[key] = match[2].trim().slice(0, limits[key])
  }
  info.name ||= `user_api_${new Date().toLocaleString()}`
  return info
}

async function persist() {
  await invoke('save_source_settings', { settings: { sources: sources.value, activeSourceId: activeSourceId.value } satisfies SourceSettings })
}

function stopRuntime() {
  frame?.remove(); frame = null; capabilities.value = null; status.value = 'idle'; error.value = ''
  for (const pending of requests.values()) { clearTimeout(pending.timer); pending.reject(new Error('音源已切换')) }
  requests.clear()
}

function startRuntime(source: MusicSourceRecord) {
  stopRuntime(); status.value = 'loading'
  frame = document.createElement('iframe'); frame.sandbox.add('allow-scripts'); frame.hidden = true
  frame.srcdoc = createSourceDocument(source); document.body.appendChild(frame)
  window.setTimeout(() => { if (status.value === 'loading') { status.value = 'error'; error.value = '音源初始化超时' } }, 20_000)
}

async function selectSource(id: string | null) {
  if (id == null) { activeSourceId.value = null; stopRuntime(); await persist(); return }
  const source = sources.value.find(item => item.id === id)
  if (!source) throw new Error('音源不存在')
  activeSourceId.value = id; startRuntime(source); await persist()
}

async function importSource(script: string) {
  if (sources.value.length >= 20) throw new Error('最多只能导入 20 个自定义源')
  if (new Blob([script]).size > 9_000_000) throw new Error('源脚本不能超过 9 MB')
  const duplicate = sources.value.find(source => source.script === script)
  if (duplicate) throw new Error(`脚本内容与已有的源「${duplicate.name}」相同`)
  const info = parseScriptInfo(script)
  const source: MusicSourceRecord = { id: `user_api_${Math.random().toString().slice(2, 5)}_${Date.now()}`, ...info, allowShowUpdateAlert: true, script }
  sources.value.push(source); await persist(); await selectSource(source.id)
  return source
}

async function importFromUrl(url: string) {
  if (!/^https?:\/\//.test(url)) throw new Error('请输入有效的 HTTP 或 HTTPS 地址')
  const response = await invoke<{ statusCode: number; body: string }>('source_http_request', { request: { url, method: 'GET', headers: {}, timeoutMs: 60_000 } })
  if (response.statusCode < 200 || response.statusCode >= 300) throw new Error(`下载失败：HTTP ${response.statusCode}`)
  return importSource(response.body)
}

async function removeSource(id: string) {
  const index = sources.value.findIndex(source => source.id === id); if (index < 0) return
  sources.value.splice(index, 1)
  if (activeSourceId.value === id) { activeSourceId.value = null; stopRuntime() }
  await persist()
}

async function setAllowUpdateAlert(id: string, enable: boolean) {
  const source = sources.value.find(source => source.id === id); if (!source) return
  source.allowShowUpdateAlert = enable; await persist()
}

window.addEventListener('message', async ({ data, source }) => {
  if (!frame || source !== frame.contentWindow || data?.channel !== 'rubia-source') return
  if (data.type === 'inited') {
    if (data.data?.status === false) { status.value = 'error'; error.value = data.data.message || '音源初始化失败'; return }
    capabilities.value = { sources: data.data?.sources ?? {} }; status.value = 'ready'; return
  }
  if (data.type === 'init-error') { status.value = 'error'; error.value = data.data.message; return }
  if (data.type === 'updateAlert' && activeSource.value?.allowShowUpdateAlert) {
    updateNotice.visible = true; updateNotice.name = activeSource.value.name; updateNotice.log = String(data.data?.log ?? '').slice(0, 1024); updateNotice.updateUrl = /^https?:\/\//.test(data.data?.updateUrl) ? data.data.updateUrl : ''; return
  }
  if (data.type === 'source-response') {
    const pending = requests.get(data.data.id); if (!pending) return
    clearTimeout(pending.timer); requests.delete(data.data.id)
    data.data.error ? pending.reject(new Error(data.data.error)) : pending.resolve(data.data.result); return
  }
  if (data.type === 'http-request') {
    const { id, url, options } = data.data
    const body = options.body ?? (options.form ? new URLSearchParams(options.form).toString() : undefined)
    try { const response = await invoke('source_http_request', { request: { url, method: options.method || 'GET', headers: options.headers || {}, body, timeoutMs: options.timeout } }); send('http-response', { id, response }) }
    catch (requestError) { send('http-response', { id, error: String(requestError) }) }
  }
})

async function initialize() {
  try {
    const settings = await invoke<SourceSettings>('load_source_settings')
    sources.value = Array.isArray(settings.sources) ? settings.sources : []; activeSourceId.value = settings.activeSourceId
    const source = activeSource.value; if (source) startRuntime(source); else activeSourceId.value = null
  } catch (cause) { error.value = String(cause); status.value = 'error' }
  finally { initialized.value = true }
}
void initialize()

function canResolve(source: string, quality: Quality) { const info = capabilities.value?.sources?.[source]; return status.value === 'ready' && !!info?.actions.includes('musicUrl') && info.qualitys.includes(quality) }
function resolveMusicUrl(track: MusicTrack, quality: Quality) {
  const id = `request_${++sequence}`
  return new Promise<string>((resolve, reject) => { const timer = window.setTimeout(() => { requests.delete(id); reject(new Error('自定义源请求超时')) }, 20_000); requests.set(id, { resolve, reject, timer }); send('source-request', { id, request: { source: track.source, action: 'musicUrl', info: { type: quality, musicInfo: legacyMusicInfo(track) } } }) })
    .then(url => { if (typeof url !== 'string' || url.length > 2048 || !/^https?:/.test(url)) throw new Error('自定义源返回了无效地址'); return url })
}

export function useSourceRuntime() { return { sources, activeSourceId, activeSource, sourceName, capabilities, status, error, initialized, updateNotice, importSource, importFromUrl, selectSource, removeSource, setAllowUpdateAlert, canResolve, resolveMusicUrl } }
