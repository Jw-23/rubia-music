<script setup lang="ts">
import { ref } from 'vue'
import { searchMusic } from '../../services/musicApi'
import type { MusicTrack } from '../../types/music'
import { usePlayer } from '../player/playerStore'
const query = ref(''); const results = ref<MusicTrack[]>([]); const loading = ref(false); const error = ref(''); const searched = ref(false)
const player = usePlayer()
async function search() { const text = query.value.trim(); if (!text) return; loading.value = true; error.value = ''; searched.value = true; try { results.value = await searchMusic(text) } catch (e) { error.value = String(e) } finally { loading.value = false } }
const formatDuration = (s: number) => `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`
</script>
<template>
  <section class="search-view">
    <header class="topbar"><form class="search-box" @submit.prevent="search"><span>⌕</span><input v-model="query" autofocus placeholder="搜索歌曲、艺人或专辑" /><kbd>⌘ K</kbd></form><button class="avatar">R</button></header>
    <div v-if="!searched" class="hero"><div class="eyebrow">从音乐开始</div><h1>今天想听什么？</h1><p>搜索你喜欢的歌曲，Rubia 会为你找到最适合的版本。</p><div class="suggestions"><button v-for="item in ['周杰伦','陈奕迅','林俊杰','孙燕姿']" :key="item" @click="query=item; search()">{{ item }}</button></div></div>
    <div v-else class="results">
      <div class="result-heading"><div><p>搜索结果</p><h1>{{ query }}</h1></div><span>{{ results.length }} 首歌曲</span></div>
      <div v-if="loading" class="status-card"><span class="spinner" />正在搜索音乐…</div>
      <div v-else-if="error" class="status-card error">{{ error }}</div>
      <div v-else-if="!results.length" class="status-card">没有找到相关歌曲</div>
      <div v-else class="track-table">
        <div class="track table-head"><span>#</span><span>歌曲</span><span>专辑</span><span>音质</span><span>时长</span></div>
        <button v-for="(track,index) in results" :key="track.source+track.id" class="track" :class="{ playing: player.state.current?.id === track.id }" @dblclick="player.play(track, results)">
          <span class="index">{{ index + 1 }}</span><span class="song"><i>♫</i><span><strong>{{ track.name }}</strong><small>{{ track.artist }}</small></span></span><span class="album">{{ track.album || '未知专辑' }}</span><span><b class="quality">{{ track.qualities[0] || '128k' }}</b></span><span>{{ formatDuration(track.durationSeconds) }}</span><span class="row-play" @click.stop="player.play(track, results)">▶</span>
        </button>
      </div>
    </div>
  </section>
</template>
