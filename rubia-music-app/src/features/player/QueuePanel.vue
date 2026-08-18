<script setup lang="ts">
import ArtworkImage from '../../components/ArtworkImage.vue'
import { usePlayer } from './playerStore'
defineEmits<{ close: [] }>()
const player = usePlayer()
</script>
<template><aside class="queue-panel"><header><div><small>接下来播放</small><h2>播放队列</h2></div><button @click="$emit('close')">×</button></header><div v-if="player.state.queue.length" class="queue-list"><button v-for="track in player.state.queue" :key="track.source+track.id" :class="{ active: player.state.current?.id === track.id }" @click="player.play(track, player.state.queue)"><ArtworkImage :src="track.artworkUrl" :alt="track.name"/><span><strong>{{ track.name }}</strong><small>{{ track.artist }}</small></span><i v-if="player.state.current?.id === track.id">{{ player.state.playing ? '▮▮' : '▶' }}</i></button></div><div v-else class="queue-empty">播放一首歌曲后生成队列</div></aside></template>
