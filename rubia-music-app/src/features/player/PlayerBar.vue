<script setup lang="ts">
import { computed, ref } from 'vue'
import ArtworkImage from '../../components/ArtworkImage.vue'
import LyricsView from '../lyrics/LyricsView.vue'
import PlaybackButtons from './PlaybackButtons.vue'
import QueuePanel from './QueuePanel.vue'
import { usePlayer } from './playerStore'

const player = usePlayer()
const lyricsOpen = ref(false)
const queueOpen = ref(false)

const time = (seconds: number) => `${Math.floor(seconds / 60)}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`
const timelineProgress = computed(() => `${Math.min(100, Math.max(0, player.progress.value * 100))}%`)
const volumeProgress = computed(() => `${Math.min(100, Math.max(0, player.state.volume * 100))}%`)
</script>

<template>
  <footer class="player-bar">
    <div class="now-playing">
      <button class="cover-button" :disabled="!player.state.current" title="打开歌词" aria-label="打开歌词" @click="lyricsOpen = true">
        <ArtworkImage :src="player.state.current?.artworkUrl" :alt="player.state.current ? `${player.state.current.name} 封面` : ''" size="player" />
      </button>
      <div class="track-copy">
        <strong>{{ player.state.current?.name || '暂未播放' }}</strong>
        <span>{{ player.state.current?.artist || '选择一首歌曲开始聆听' }}</span>
      </div>
    </div>

    <div class="transport">
      <PlaybackButtons class="transport-buttons" />
      <div class="timeline">
        <span>{{ time(player.state.currentTime) }}</span>
        <input class="player-range" type="range" min="0" :max="player.state.duration || 1" :value="player.state.currentTime" :style="{ '--range-progress': timelineProgress }" aria-label="播放进度" @input="player.seek(Number(($event.target as HTMLInputElement).value))" />
        <span>{{ time(player.state.duration) }}</span>
      </div>
    </div>

    <div class="volume">
      <button class="queue-button" :class="{ active: queueOpen }" :aria-pressed="queueOpen" title="播放队列" aria-label="播放队列" @click="queueOpen = !queueOpen">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 7h9M10 12h9M10 17h9" /><circle cx="5.5" cy="7" r="1" /><circle cx="5.5" cy="12" r="1" /><circle cx="5.5" cy="17" r="1" /></svg>
      </button>
      <span class="volume-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 10v4h3l4 3V7l-4 3H5ZM15 9.2a4 4 0 0 1 0 5.6M17.5 7a7 7 0 0 1 0 10" /></svg></span>
      <input class="player-range volume-range" type="range" min="0" max="1" step="0.01" :value="player.state.volume" :style="{ '--range-progress': volumeProgress }" aria-label="音量" @input="player.setVolume(Number(($event.target as HTMLInputElement).value))" />
    </div>

    <div v-if="player.state.error" class="player-error">{{ player.state.error }}</div>
    <LyricsView v-if="lyricsOpen" @close="lyricsOpen = false" />
    <QueuePanel v-if="queueOpen" @close="queueOpen = false" />
  </footer>
</template>
