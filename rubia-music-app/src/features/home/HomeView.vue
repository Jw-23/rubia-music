<script setup lang="ts">
import TrackList from '../../components/music/TrackList.vue'
import { useLibrary } from '../library/libraryStore'
import { navigateTo } from '../navigation/navigationState'
import AppIcon from '../../components/AppIcon.vue'
const library = useLibrary()
</script>
<template><section class="home-view"><div class="home-welcome"><p>Rubia Music</p><h1>欢迎回来</h1><span>继续聆听，或者发现下一首喜欢的歌。</span></div><div class="home-cards"><button @click="navigateTo('search')"><b><AppIcon name="search"/></b><span><strong>搜索音乐</strong><small>歌曲、艺人或专辑</small></span></button><button @click="navigateTo('favorites')"><b><AppIcon name="heart"/></b><span><strong>收藏歌曲</strong><small>{{ library.favorites.value.length }} 首</small></span></button><button @click="navigateTo('playlists')"><b><AppIcon name="playlist"/></b><span><strong>我的歌单</strong><small>{{ library.playlists.value.length }} 个 · {{ library.playlistTrackCount.value }} 首</small></span></button><button @click="navigateTo('recent')"><b><AppIcon name="history"/></b><span><strong>最近播放</strong><small>{{ library.recent.value.length }} 首</small></span></button></div><div class="home-section"><h2>最近播放</h2><TrackList v-if="library.recent.value.length" :tracks="library.recent.value.slice(0, 8)"/><div v-else class="library-empty compact">播放歌曲后会出现在这里</div></div></section></template>
