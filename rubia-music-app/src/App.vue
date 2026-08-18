<script setup lang="ts">
import AppSidebar from './components/layout/AppSidebar.vue'
import SearchView from './features/search/SearchView.vue'
import PlayerBar from './features/player/PlayerBar.vue'
import SourcePanel from './features/sources/SourcePanel.vue'
import { useSourceRuntime } from './features/sources/useSourceRuntime'
import HomeView from './features/home/HomeView.vue'
import LibraryView from './features/library/LibraryView.vue'
import { activeView } from './features/navigation/navigationState'
const sourceRuntime = useSourceRuntime()
</script>
<template>
  <div class="app-shell">
    <AppSidebar :source-name="sourceRuntime.sourceName.value" />
    <main class="content"><SearchView v-if="activeView === 'search'"/><HomeView v-else-if="activeView === 'home'"/><LibraryView v-else :mode="activeView"/></main>
    <PlayerBar />
    <SourcePanel />
  </div>
</template>
