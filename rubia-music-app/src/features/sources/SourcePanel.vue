<script setup lang="ts">
import { ref } from 'vue'
import { openUrl } from '@tauri-apps/plugin-opener'
import { sourceSettingsOpen } from './settingsState'
import { useSourceRuntime } from './useSourceRuntime'

const runtime = useSourceRuntime()
const input = ref<HTMLInputElement>()
const onlineUrl = ref('')
const importing = ref(false)
const message = ref('')

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
      <aside class="settings-nav"><h2>设置</h2><button class="active"><span>⌁</span>音乐来源</button><button disabled><span>▶</span>播放</button><button disabled><span>⇩</span>下载</button><button disabled><span>⌘</span>快捷键</button></aside>
      <main class="settings-content">
        <button class="modal-close" @click="sourceSettingsOpen=false">×</button>
        <p class="eyebrow">音乐来源</p><h1>自定义音源</h1><p class="settings-intro">管理用于解析歌曲播放地址的 LX Music 音源。一次只能启用一个源。</p>
        <div class="builtin-source source-card" :class="{ selected: runtime.activeSourceId.value === null }" @click="select(null)"><div class="source-logo">R</div><div><strong>内置解析</strong><small>Rubia Music 基础播放服务</small></div><span class="source-check">{{ runtime.activeSourceId.value === null ? '✓' : '' }}</span></div>
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
      </main>
    </section>
  </div>
  <div v-if="runtime.updateNotice.visible" class="modal-backdrop"><section class="update-modal"><p class="eyebrow">音源更新</p><h2>{{ runtime.updateNotice.name }}</h2><p>{{ runtime.updateNotice.log }}</p><div><button @click="runtime.updateNotice.visible=false">关闭</button><button v-if="runtime.updateNotice.updateUrl" class="primary-button" @click="openUrl(runtime.updateNotice.updateUrl); runtime.updateNotice.visible=false">打开更新地址</button></div></section></div>
</template>
