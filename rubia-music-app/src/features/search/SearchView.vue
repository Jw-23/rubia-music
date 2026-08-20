<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { searchMusic } from '../../services/musicApi'
import TrackList from '../../components/music/TrackList.vue'
import AppIcon from '../../components/AppIcon.vue'
import { searchError as error, searchLoading as loading, searchPerformed as searched, searchQuery as query, searchResults as results } from './searchState'
const searchInput = ref<HTMLInputElement>()
async function search() { const text = query.value.trim(); if (!text) return; loading.value = true; error.value = ''; searched.value = true; try { results.value = await searchMusic(text) } catch (e) { error.value = String(e) } finally { loading.value = false } }
const focusSearch = () => searchInput.value?.focus()
onMounted(() => window.addEventListener('rubia-focus-search', focusSearch))
onBeforeUnmount(() => window.removeEventListener('rubia-focus-search', focusSearch))
</script>
<template>
  <section class="search-view">
    <header class="topbar"><form class="search-box" @submit.prevent="search"><AppIcon name="search" :size="19"/><input ref="searchInput" v-model="query" autofocus placeholder="搜索歌曲、艺人或专辑" /><kbd>⌘ F</kbd></form></header>
    <div v-if="!searched" class="hero"><div class="eyebrow">从音乐开始</div><h1>今天想听什么？</h1><p>搜索你喜欢的歌曲，Rubia 会为你找到最适合的版本。</p><div class="suggestions"><button v-for="item in ['周杰伦','陈奕迅','林俊杰','孙燕姿']" :key="item" @click="query=item; search()">{{ item }}</button></div></div>
    <div v-else class="results">
      <div class="result-heading"><div><p>搜索结果</p><h1>{{ query }}</h1></div><span>{{ results.length }} 首歌曲</span></div>
      <div v-if="loading" class="status-card"><span class="spinner" />正在搜索音乐…</div>
      <div v-else-if="error" class="status-card error">{{ error }}</div>
      <div v-else-if="!results.length" class="status-card">没有找到相关歌曲</div>
      <TrackList v-else :tracks="results"/>
    </div>
  </section>
</template>
