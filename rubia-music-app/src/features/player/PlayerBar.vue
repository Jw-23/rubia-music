<script setup lang="ts">
import { ref } from 'vue'
import ArtworkImage from '../../components/ArtworkImage.vue'
import LyricsView from '../lyrics/LyricsView.vue'
import { usePlayer } from './playerStore'
const player = usePlayer()
const lyricsOpen = ref(false)
const time = (seconds: number) => `${Math.floor(seconds / 60)}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`
</script>
<template>
  <footer class="player-bar">
    <div class="now-playing"><button class="cover-button" :disabled="!player.state.current" title="打开歌词" @click="lyricsOpen=true"><ArtworkImage :src="player.state.current?.artworkUrl" :alt="player.state.current ? `${player.state.current.name} 封面` : ''" size="player"/></button><div class="track-copy"><strong>{{ player.state.current?.name || '暂未播放' }}</strong><span>{{ player.state.current?.artist || '选择一首歌曲开始聆听' }}</span></div></div>
    <div class="transport"><div class="transport-buttons"><button disabled>↶</button><button class="play-button" :disabled="!player.state.current || player.state.loading" @click="player.toggle">{{ player.state.loading ? '…' : player.state.playing ? 'Ⅱ' : '▶' }}</button><button @click="player.playNext">↷</button></div><div class="timeline"><span>{{ time(player.state.currentTime) }}</span><input type="range" min="0" :max="player.state.duration || 1" :value="player.state.currentTime" @input="player.seek(Number(($event.target as HTMLInputElement).value))" /><span>{{ time(player.state.duration) }}</span></div></div>
    <div class="volume"><span>◖</span><input type="range" min="0" max="1" step="0.01" :value="player.state.volume" @input="player.setVolume(Number(($event.target as HTMLInputElement).value))" /></div>
    <div v-if="player.state.error" class="player-error">{{ player.state.error }}</div>
    <LyricsView v-if="lyricsOpen" @close="lyricsOpen=false" />
  </footer>
</template>
