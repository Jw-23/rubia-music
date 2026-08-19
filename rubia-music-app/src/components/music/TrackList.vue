<script setup lang="ts">
import ArtworkImage from '../ArtworkImage.vue'
import type { MusicTrack } from '../../types/music'
import { usePlayer } from '../../features/player/playerStore'
import { useLibrary } from '../../features/library/libraryStore'

const props = withDefaults(defineProps<{ tracks: MusicTrack[]; removable?: boolean; playlistId?: string }>(), { removable: false, playlistId: 'default' })
const player = usePlayer(); const library = useLibrary()
const duration = (seconds: number) => `${Math.floor(seconds / 60)}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`
const addTo = (track: MusicTrack, playlistId: string, event: MouseEvent) => { library.addToPlaylist(track, playlistId); (event.currentTarget as HTMLElement).closest('details')?.removeAttribute('open') }
</script>
<template>
  <div class="track-table">
    <div class="track table-head"><span>#</span><span>歌曲</span><span>专辑</span><span>音质</span><span>时长</span></div>
    <div v-for="(track,index) in tracks" :key="track.source+track.id" class="track" :class="{ playing: player.state.current?.id === track.id && player.state.current?.source === track.source }" @dblclick="player.play(track, props.tracks)">
      <span class="index"><span v-if="player.state.current?.id === track.id && player.state.current?.source === track.source" class="playing-bars" :class="{ paused: !player.state.playing }" :aria-label="player.state.playing ? '正在播放' : '已暂停'"><i/><i/><i/></span><template v-else>{{ index + 1 }}</template></span><span class="song"><ArtworkImage :src="track.artworkUrl" :alt="`${track.name} 封面`"/><span><strong>{{ track.name }}</strong><small>{{ track.artist }}</small></span></span><span class="album">{{ track.album || '未知专辑' }}</span><span><b class="quality">{{ track.qualities[0] || '128k' }}</b></span><span>{{ duration(track.durationSeconds) }}</span>
      <span class="track-actions"><button title="播放" @click.stop="player.play(track, props.tracks)">▶</button><button :class="{ liked: library.isFavorite(track) }" :title="library.isFavorite(track) ? '取消收藏' : '收藏'" @click.stop="library.toggleFavorite(track)">{{ library.isFavorite(track) ? '♥' : '♡' }}</button><details v-if="!removable" class="playlist-picker" @click.stop><summary title="添加到歌单">＋</summary><div><small>添加到歌单</small><button v-for="playlist in library.playlists.value" :key="playlist.id" :class="{ added: library.isInPlaylist(track, playlist.id) }" @click="addTo(track, playlist.id, $event)"><span>{{ playlist.name }}</span><i>{{ library.isInPlaylist(track, playlist.id) ? '✓' : playlist.tracks.length }}</i></button></div></details><button v-else title="从当前歌单移除" @click.stop="library.removeFromPlaylist(track, props.playlistId)">−</button></span>
    </div>
  </div>
</template>
