<script setup lang="ts">
import { usePlayer } from './playerStore'

const player = usePlayer()
</script>

<template>
  <div class="playback-buttons">
    <button class="transport-button" disabled title="上一首" aria-label="上一首">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 6v12M18 6.8 9.2 12l8.8 5.2V6.8Z" /></svg>
    </button>
    <button class="play-button" :disabled="!player.state.current || player.state.loading" :title="player.state.playing ? '暂停' : '播放'" :aria-label="player.state.playing ? '暂停' : '播放'" @click="player.toggle">
      <span v-if="player.state.loading" class="player-loading" aria-hidden="true" />
      <svg v-else-if="player.state.playing" viewBox="0 0 24 24" aria-hidden="true"><path d="M8.75 6.5v11M15.25 6.5v11" /></svg>
      <svg v-else class="play-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m8.7 6.65 9 5.35-9 5.35V6.65Z" /></svg>
    </button>
    <button class="transport-button" title="下一首" aria-label="下一首" @click="player.playNext">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17 6v12M6 6.8l8.8 5.2L6 17.2V6.8Z" /></svg>
    </button>
  </div>
</template>
