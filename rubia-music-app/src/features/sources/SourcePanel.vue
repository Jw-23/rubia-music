<script setup lang="ts">
import { ref } from 'vue'
import { openUrl } from '@tauri-apps/plugin-opener'
import { sourceSettingsOpen } from './settingsState'
import { useSourceRuntime } from './useSourceRuntime'
import { appSettings, resetAppSettings } from '../settings/appSettings'
import { useLibrary } from '../library/libraryStore'
import rubiaIcon from '../../assets/rubia-brand-icon.png'

const runtime = useSourceRuntime()
const input = ref<HTMLInputElement>()
const onlineUrl = ref('')
const importing = ref(false)
const message = ref('')
const activeSection = ref<'general' | 'playback' | 'lyrics' | 'source' | 'data'>('general')
const library = useLibrary()
const clearLibrary = () => { if (confirm('确定清空收藏、歌单和最近播放吗？')) library.clearLibrary() }

async function run(action: () => Promise<unknown>) {
  importing.value = true; message.value = ''
  try { await action() } catch (error) { message.value = error instanceof Error ? error.message : String(error) }
  finally { importing.value = false }
}
async function importFile(event: Event) {
  const target = event.target as HTMLInputElement; const file = target.files?.[0]; if (!file) return
  await run(async () => runtime.importSource(await file.text())); target.value = ''
}
async function importOnline() { const url = onlineUrl.value.trim(); if (!url) return; await run(() => runtime.importFromUrl(url)); if (!message.value) onlineUrl.value = '' }
async function select(id: string | null) { await run(() => runtime.selectSource(id)) }
async function remove(id: string, name: string) { if (confirm(`确定删除音源「${name}」吗？`)) await run(() => runtime.removeSource(id)) }
</script>

<template>
  <button class="source-trigger" title="音源设置" @click="sourceSettingsOpen=true">⚙</button>
  <div v-if="sourceSettingsOpen" class="modal-backdrop" @click.self="sourceSettingsOpen=false">
    <section class="settings-modal">
      <aside class="settings-nav"><h2>设置</h2><button :class="{ active: activeSection === 'general' }" @click="activeSection='general'"><span>⚙</span>通用</button><button :class="{ active: activeSection === 'playback' }" @click="activeSection='playback'"><span>▶</span>播放</button><button :class="{ active: activeSection === 'lyrics' }" @click="activeSection='lyrics'"><span>≋</span>歌词</button><button :class="{ active: activeSection === 'source' }" @click="activeSection='source'"><span>⌁</span>音乐来源</button><button :class="{ active: activeSection === 'data' }" @click="activeSection='data'"><span>▣</span>数据</button></aside>
      <main class="settings-content">
        <button class="modal-close" @click="sourceSettingsOpen=false">×</button>
        <section v-if="activeSection === 'general'" class="settings-page"><p class="eyebrow">通用</p><h1>使用偏好</h1><p class="settings-intro">调整 Rubia Music 的整体交互体验。</p><div class="preference-group"><h3>界面</h3><label class="setting-row"><span><strong>减少动态效果</strong><small>关闭非必要的过渡和动画</small></span><input v-model="appSettings.reduceMotion" type="checkbox"/></label></div><div class="preference-group"><h3>默认音量</h3><label class="setting-slider"><span>{{ Math.round(appSettings.volume * 100) }}%</span><input v-model.number="appSettings.volume" type="range" min="0" max="1" step="0.01"/></label><small>播放器调整音量后也会自动保存。</small></div></section>
        <section v-else-if="activeSection === 'playback'" class="settings-page"><p class="eyebrow">播放</p><h1>播放设置</h1><p class="settings-intro">选择解析音质和失败处理方式。</p><div class="preference-group"><h3>优先音质</h3><div class="quality-options"><label v-for="item in [{v:'128k',n:'标准 128k'},{v:'320k',n:'高品质 320k'},{v:'flac',n:'无损 FLAC'},{v:'flac24bit',n:'Hi-Res'}]" :key="item.v"><input v-model="appSettings.playbackQuality" type="radio" :value="item.v"/><span>{{ item.n }}</span></label></div><p class="setting-note">若歌曲或音源不支持所选音质，会自动选择可用音质。</p></div><div class="preference-group"><label class="setting-row"><span><strong>自定义源失败时使用内置解析</strong><small>关闭后，自定义源返回无效地址会直接报错</small></span><input v-model="appSettings.fallbackToBuiltin" type="checkbox"/></label></div></section>
        <section v-else-if="activeSection === 'lyrics'" class="settings-page"><p class="eyebrow">歌词</p><h1>歌词显示</h1><p class="settings-intro">控制全屏歌词的排版和滚动方式。</p><div class="preference-group"><h3>歌词字号</h3><label class="setting-slider"><span>{{ appSettings.lyricFontSize }}px</span><input v-model.number="appSettings.lyricFontSize" type="range" min="20" max="38" step="1"/></label></div><div class="preference-group"><label class="setting-row"><span><strong>灵动滚动</strong><small>使用随距离变化的平滑滚动动画</small></span><input v-model="appSettings.smoothLyrics" type="checkbox"/></label><label class="setting-row"><span><strong>显示大封面</strong><small>在歌词左侧展示专辑封面和歌曲信息</small></span><input v-model="appSettings.showLyricArtwork" type="checkbox"/></label></div></section>
        <section v-else-if="activeSection === 'data'" class="settings-page"><p class="eyebrow">数据</p><h1>数据管理</h1><p class="settings-intro">管理保存在这台设备上的资料库和偏好。</p><div class="preference-group"><label class="setting-row"><span><strong>资料库数据</strong><small>收藏 {{ library.favorites.value.length }} 首 · 歌单 {{ library.playlist.value.length }} 首 · 最近播放 {{ library.recent.value.length }} 首</small></span><button class="danger-button" @click="clearLibrary">清空</button></label><label class="setting-row"><span><strong>恢复默认设置</strong><small>不会删除音乐源和资料库</small></span><button class="secondary-button" @click="resetAppSettings">恢复</button></label></div></section>
        <section v-else class="settings-page"><p class="eyebrow">音乐来源</p><h1>自定义音源</h1><p class="settings-intro">管理用于解析歌曲播放地址的 LX Music 音源。一次只能启用一个源。</p>
        <div class="builtin-source source-card" :class="{ selected: runtime.activeSourceId.value === null }" @click="select(null)"><div class="source-logo app-source-logo"><img :src="rubiaIcon" alt="Rubia Music"/></div><div><strong>内置解析</strong><small>Rubia Music 基础播放服务</small></div><span class="source-check">{{ runtime.activeSourceId.value === null ? '✓' : '' }}</span></div>
        <div class="source-list">
          <article v-for="source in runtime.sources.value" :key="source.id" class="source-card managed" :class="{ selected: runtime.activeSourceId.value === source.id }" @click="select(source.id)">
            <div class="source-logo custom">JS</div><div class="source-meta"><div><strong>{{ source.name }}</strong><b v-if="source.version">{{ /^\d/.test(source.version) ? `v${source.version}` : source.version }}</b><b v-if="source.author">{{ source.author }}</b></div><small>{{ source.description || '暂无描述' }}</small><label @click.stop><input type="checkbox" :checked="source.allowShowUpdateAlert" @change="runtime.setAllowUpdateAlert(source.id, ($event.target as HTMLInputElement).checked)"/>允许该源显示更新提醒</label></div>
            <span v-if="runtime.activeSourceId.value === source.id" class="runtime-state" :class="runtime.status.value">{{ runtime.status.value === 'ready' ? '运行中' : runtime.status.value === 'loading' ? '初始化' : '异常' }}</span>
            <button class="delete-source" title="删除" @click.stop="remove(source.id, source.name)">⌫</button>
          </article>
        </div>
        <div v-if="!runtime.sources.value.length" class="empty-sources">尚未导入自定义源</div>
        <p v-if="runtime.error.value || message" class="modal-error">{{ message || runtime.error.value }}</p>
        <section class="import-section"><h3>导入音源</h3><div class="online-import"><input v-model="onlineUrl" type="url" placeholder="https://example.com/source.js" @keyup.enter="importOnline"/><button :disabled="importing" @click="importOnline">从 URL 导入</button></div><div class="import-divider"><span>或</span></div><input ref="input" type="file" accept=".js,text/javascript" hidden @change="importFile"/><button class="file-import" :disabled="importing || runtime.sources.value.length >= 20" @click="input?.click()">选择本地 .js 文件</button></section>
        <footer class="settings-footer"><span>已导入 {{ runtime.sources.value.length }} / 20</span><button @click="openUrl('https://lyswhut.github.io/lx-music-doc/desktop/custom-source')">音源编写说明 ↗</button></footer>
        </section>
      </main>
    </section>
  </div>
  <div v-if="runtime.updateNotice.visible" class="modal-backdrop"><section class="update-modal"><p class="eyebrow">音源更新</p><h2>{{ runtime.updateNotice.name }}</h2><p>{{ runtime.updateNotice.log }}</p><div><button @click="runtime.updateNotice.visible=false">关闭</button><button v-if="runtime.updateNotice.updateUrl" class="primary-button" @click="openUrl(runtime.updateNotice.updateUrl); runtime.updateNotice.visible=false">打开更新地址</button></div></section></div>
</template>

<style scoped>
.app-source-logo { overflow: hidden; background: transparent; }
.app-source-logo img { display: block; width: 100%; height: 100%; object-fit: cover; }
</style>
