<script setup lang="ts">
import { ref } from 'vue'
import { useSourceRuntime } from './useSourceRuntime'
const runtime = useSourceRuntime(); const open = ref(false); const input = ref<HTMLInputElement>()
async function importSource(event: Event) { const file = (event.target as HTMLInputElement).files?.[0]; if (!file) return; const script = await file.text(); const name = /@name\s+([^\r\n*]+)/.exec(script)?.[1]?.trim() || file.name; runtime.loadSource(script, name); open.value = false }
</script>
<template>
  <button class="source-trigger" title="音源设置" @click="open=true">⌁</button>
  <div v-if="open" class="modal-backdrop" @click.self="open=false"><section class="source-modal"><button class="modal-close" @click="open=false">×</button><div class="modal-icon">⌁</div><p class="eyebrow">播放服务</p><h2>自定义音源</h2><p>导入 LX Music JavaScript 音源。脚本会在独立沙箱中运行，网络请求由 Rust 转发。</p><div class="source-status"><i :class="runtime.status.value"/><div><strong>{{ runtime.sourceName.value }}</strong><small>{{ runtime.status.value === 'ready' ? '已就绪' : runtime.status.value === 'loading' ? '正在初始化' : '使用内置解析' }}</small></div></div><p v-if="runtime.error.value" class="modal-error">{{ runtime.error.value }}</p><input ref="input" type="file" accept=".js,text/javascript" hidden @change="importSource"/><button class="primary-button" @click="input?.click()">选择源文件</button><small class="compat-note">首版支持 inited、request、musicUrl 与 lx.request；加密工具兼容层将在下一阶段补齐。</small></section></div>
</template>
