<script setup lang="ts">
import { computed } from 'vue'
import ArtworkImage from '../../components/ArtworkImage.vue'
import AppIcon from '../../components/AppIcon.vue'
import { useMusicCache } from './musicCache'
import { usePlayer } from '../player/playerStore'

const cache = useMusicCache()
const player = usePlayer()
const active = computed(() => Object.entries(cache.downloading.value).map(([key, progress]) => ({ key, progress, track: cache.activeTracks.value[key] })).filter(item => item.track))
const completed = computed(() => Object.entries(cache.records.value).map(([key, record]) => ({ key, ...record })).filter(item => item.track).sort((a, b) => b.savedAt - a.savedAt))
const size = (bytes: number) => bytes ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : '已缓存'
</script>

<template>
  <section class="downloads-view library-view">
    <header class="library-heading"><p>离线音乐</p><h1>下载管理</h1><span>{{ completed.length }} 首歌曲</span></header>
    <section v-if="active.length" class="download-section"><h2>正在下载</h2><article v-for="item in active" :key="item.key" class="download-row"><ArtworkImage :src="item.track.artworkUrl" :alt="item.track.name"/><div><strong>{{ item.track.name }}</strong><small>{{ item.track.artist }}</small><i><span :style="{ width: `${item.progress}%` }"/></i></div><b>{{ item.progress ? `${item.progress}%` : '准备中' }}</b></article></section>
    <section class="download-section"><h2>已下载</h2><div v-if="completed.length" class="download-list"><button v-for="item in completed" :key="item.key" @click="player.play(item.track!)"><ArtworkImage :src="item.track!.artworkUrl" :alt="item.track!.name"/><span><strong>{{ item.track!.name }}</strong><small>{{ item.track!.artist }}</small></span><em>{{ size(item.bytes) }}</em><AppIcon name="play" :size="16"/></button></div><div v-else class="library-empty compact"><AppIcon name="download" :size="30"/><p>还没有离线歌曲</p><small>可从歌曲列表或歌单中下载</small></div></section>
  </section>
</template>
