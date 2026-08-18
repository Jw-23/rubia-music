<script setup lang="ts">
import { openSourceSettings } from '../../features/sources/settingsState'
import { activeView, navigateTo, type AppView } from '../../features/navigation/navigationState'
defineProps<{ sourceName: string }>()
const go = (view: AppView) => navigateTo(view)
</script>
<template>
  <aside class="sidebar">
    <div class="traffic-space" />
    <div class="brand"><span class="brand-mark">R</span><span>Rubia Music</span></div>
    <nav>
      <button class="nav-item" :class="{ active: activeView === 'search' }" @click="go('search')"><span>⌕</span>搜索</button>
      <button class="nav-item" :class="{ active: activeView === 'home' }" @click="go('home')"><span>⌂</span>首页</button>
      <p class="nav-title">资料库</p>
      <button class="nav-item" :class="{ active: activeView === 'favorites' }" @click="go('favorites')"><span>♡</span>收藏</button>
      <button class="nav-item" :class="{ active: activeView === 'playlists' }" @click="go('playlists')"><span>≡</span>歌单</button>
      <button class="nav-item" :class="{ active: activeView === 'recent' }" @click="go('recent')"><span>↻</span>最近播放</button>
      <p class="nav-title">系统</p>
      <button class="nav-item" @click="openSourceSettings"><span>⚙</span>设置</button>
    </nav>
    <div class="source-pill"><i :class="{ online: sourceName !== '内置解析' }" /><div><small>当前音源</small><strong>{{ sourceName }}</strong></div></div>
  </aside>
</template>
