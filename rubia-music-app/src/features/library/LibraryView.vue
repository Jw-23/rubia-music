<script setup lang="ts">
import { computed } from 'vue'
import TrackList from '../../components/music/TrackList.vue'
import { useLibrary } from './libraryStore'
const props = defineProps<{ mode: 'favorites' | 'playlists' | 'recent' }>()
const library = useLibrary()
const config = computed(() => props.mode === 'favorites'
  ? { eyebrow: '资料库', title: '收藏歌曲', empty: '还没有收藏歌曲', tracks: library.favorites.value, removable: false }
  : props.mode === 'recent'
    ? { eyebrow: '播放记录', title: '最近播放', empty: '还没有播放记录', tracks: library.recent.value, removable: false }
    : { eyebrow: '我的歌单', title: '默认歌单', empty: '歌单还是空的', tracks: library.playlist.value, removable: true })
</script>
<template><section class="library-view"><header class="library-heading"><p>{{ config.eyebrow }}</p><h1>{{ config.title }}</h1><span>{{ config.tracks.length }} 首歌曲</span></header><TrackList v-if="config.tracks.length" :tracks="config.tracks" :removable="config.removable"/><div v-else class="library-empty"><span>♫</span><p>{{ config.empty }}</p><small>可在搜索结果中使用收藏或添加按钮</small></div></section></template>
