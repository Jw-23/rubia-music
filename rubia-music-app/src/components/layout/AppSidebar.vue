<script setup lang="ts">
import { openSourceSettings } from '../../features/sources/settingsState'
import { activeView, navigateTo, navigateToPrimary, type AppView } from '../../features/navigation/navigationState'
import rubiaIcon from '../../assets/rubia-brand-icon.png'
import AppIcon from '../AppIcon.vue'
defineProps<{ sourceName: string }>()
const go = (view: AppView) => navigateTo(view)
</script>
<template>
  <aside class="sidebar">
    <div class="traffic-space" />
    <div class="brand"><img class="brand-mark" :src="rubiaIcon" alt="" /><span>Rubia Music</span></div>
    <nav>
      <button class="nav-item nav-search" :class="{ active: activeView === 'search' }" title="搜索" @click="go('search')"><AppIcon name="search"/><span class="nav-label">搜索</span></button>
      <button class="nav-item nav-home" :class="{ active: activeView === 'home', 'mobile-active': ['search', 'favorites', 'recent'].includes(activeView) }" title="首页" @click="navigateToPrimary"><AppIcon name="home"/><span class="nav-label">首页</span></button>
      <p class="nav-title">资料库</p>
      <button class="nav-item nav-favorites" :class="{ active: activeView === 'favorites' }" title="收藏" @click="go('favorites')"><AppIcon name="heart"/><span class="nav-label">收藏</span></button>
      <button class="nav-item nav-playlists" :class="{ active: activeView === 'playlists' }" title="歌单" @click="go('playlists')"><AppIcon name="playlist"/><span class="nav-label">歌单</span></button>
      <button class="nav-item nav-recent" :class="{ active: activeView === 'recent' }" title="最近播放" @click="go('recent')"><AppIcon name="history"/><span class="nav-label">最近播放</span></button>
      <p class="nav-title">系统</p>
      <button class="nav-item nav-settings" title="设置" @click="openSourceSettings"><AppIcon name="settings"/><span class="nav-label">设置</span></button>
    </nav>
    <div class="source-pill"><i :class="{ online: sourceName !== '内置解析' }" /><div><small>当前音源</small><strong>{{ sourceName }}</strong></div></div>
  </aside>
</template>
