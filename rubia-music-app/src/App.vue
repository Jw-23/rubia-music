<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'
import { listen, type UnlistenFn } from '@tauri-apps/api/event'
import { openUrl } from '@tauri-apps/plugin-opener'
import AppSidebar from './components/layout/AppSidebar.vue'
import SearchView from './features/search/SearchView.vue'
import PlayerBar from './features/player/PlayerBar.vue'
import SourcePanel from './features/sources/SourcePanel.vue'
import { useSourceRuntime } from './features/sources/useSourceRuntime'
import HomeView from './features/home/HomeView.vue'
import LibraryView from './features/library/LibraryView.vue'
import { activeView, navigateTo, type AppView } from './features/navigation/navigationState'
import { sourceSettingsOpen } from './features/sources/settingsState'
import { usePlayer } from './features/player/playerStore'
const sourceRuntime = useSourceRuntime()
const player = usePlayer()
let unlistenMenu: UnlistenFn | undefined

onMounted(async () => {
  void player.restoreSession()
  unlistenMenu = await listen<string>('rubia://menu', ({ payload }) => {
    const views: Record<string, AppView> = { 'view-home': 'home', 'view-search': 'search', 'view-favorites': 'favorites', 'view-playlists': 'playlists', 'view-recent': 'recent' }
    if (payload === 'settings') sourceSettingsOpen.value = true
    else if (payload === 'play-pause') void player.toggle()
    else if (payload === 'play-next') void player.playNext()
    else if (payload === 'open-help') void openUrl('https://lyswhut.github.io/lx-music-doc/desktop/custom-source')
    else if (views[payload]) { navigateTo(views[payload]); if (payload === 'view-search') requestAnimationFrame(() => window.dispatchEvent(new Event('rubia-focus-search'))) }
  })
})
onBeforeUnmount(() => unlistenMenu?.())
</script>
<template>
  <div class="app-shell">
    <AppSidebar :source-name="sourceRuntime.sourceName.value" />
    <main class="content"><SearchView v-if="activeView === 'search'"/><HomeView v-else-if="activeView === 'home'"/><LibraryView v-else :mode="activeView"/></main>
    <PlayerBar />
    <SourcePanel />
  </div>
</template>
