<script setup lang="ts">
import { openSourceSettings } from '../../features/sources/settingsState'
defineProps<{ sourceName: string }>()
</script>
<template>
  <aside class="sidebar">
    <div class="traffic-space" />
    <div class="brand"><span class="brand-mark">R</span><span>Rubia Music</span></div>
    <nav>
      <button class="nav-item active"><span>⌕</span>搜索</button>
      <button class="nav-item" disabled><span>⌂</span>首页<em>即将推出</em></button>
      <p class="nav-title">资料库</p>
      <button class="nav-item" disabled><span>♡</span>收藏</button>
      <button class="nav-item" disabled><span>≡</span>歌单</button>
      <p class="nav-title">系统</p>
      <button class="nav-item" @click="openSourceSettings"><span>⚙</span>设置</button>
    </nav>
    <div class="source-pill"><i :class="{ online: sourceName !== '内置解析' }" /><div><small>当前音源</small><strong>{{ sourceName }}</strong></div></div>
  </aside>
</template>
