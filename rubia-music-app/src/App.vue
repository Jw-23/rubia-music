<script setup lang="ts">
import AppSidebar from './components/layout/AppSidebar.vue'
import SearchView from './features/search/SearchView.vue'
import PlayerBar from './features/player/PlayerBar.vue'
import SourcePanel from './features/sources/SourcePanel.vue'
import { useSourceRuntime } from './features/sources/useSourceRuntime'
const sourceRuntime = useSourceRuntime()
</script>
<template>
  <div class="app-shell">
    <AppSidebar :source-name="sourceRuntime.sourceName.value" />
    <main class="content"><SearchView /></main>
    <PlayerBar />
    <SourcePanel />
  </div>
</template>
