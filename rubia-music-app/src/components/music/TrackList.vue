<script setup lang="ts">
import ArtworkImage from '../ArtworkImage.vue'
import type { MusicTrack } from '../../types/music'
import { usePlayer } from '../../features/player/playerStore'
import { useLibrary } from '../../features/library/libraryStore'

const props = withDefaults(defineProps<{ tracks: MusicTrack[]; removable?: boolean }>(), { removable: false })
const player = usePlayer(); const library = useLibrary()
const duration = (seconds: number) => `${Math.floor(seconds / 60)}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`
</script>
<template>
  <div class="track-table">
    <div class="track table-head"><span>#</span><span>歌曲</span><span>专辑</span><span>音质</span><span>时长</span></div>
    <div v-for="(track,index) in tracks" :key="track.source+track.id" class="track" :class="{ playing: player.state.current?.id === track.id }" @dblclick="player.play(track, props.tracks)">
      <span class="index">{{ index + 1 }}</span><span class="song"><ArtworkImage :src="track.artworkUrl" :alt="`${track.name} 封面`"/><span><strong>{{ track.name }}</strong><small>{{ track.artist }}</small></span></span><span class="album">{{ track.album || '未知专辑' }}</span><span><b class="quality">{{ track.qualities[0] || '128k' }}</b></span><span>{{ duration(track.durationSeconds) }}</span>
      <span class="track-actions"><button title="播放" @click.stop="player.play(track, props.tracks)">▶</button><button :class="{ liked: library.isFavorite(track) }" :title="library.isFavorite(track) ? '取消收藏' : '收藏'" @click.stop="library.toggleFavorite(track)">{{ library.isFavorite(track) ? '♥' : '♡' }}</button><button v-if="!removable" title="添加到歌单" @click.stop="library.addToPlaylist(track)">＋</button><button v-else title="从歌单移除" @click.stop="library.removeFromPlaylist(track)">−</button></span>
    </div>
  </div>
</template>
