<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import ArtworkImage from '../../components/ArtworkImage.vue'
import { getMusicLyrics } from '../../services/musicApi'
import type { LyricLine } from '../../types/music'
import { usePlayer } from '../player/playerStore'

const player = usePlayer()
const lines = ref<LyricLine[]>([])
const loading = ref(false)
const error = ref('')
const lineElements = ref<HTMLElement[]>([])
const scrollContainer = ref<HTMLElement | null>(null)
let scrollFrame = 0
const activeIndex = computed(() => {
  let index = -1
  for (let i = 0; i < lines.value.length; i++) {
    if (lines.value[i].timeSeconds > player.state.currentTime + 0.08) break
    index = i
  }
  return index
})

watch(() => player.state.current, async track => {
  lines.value = []; error.value = ''
  if (!track) return
  loading.value = true
  try { lines.value = await getMusicLyrics(track) }
  catch (cause) { error.value = String(cause) }
  finally { loading.value = false }
}, { immediate: true })

const animateToLine = (index: number) => {
  const container = scrollContainer.value; const line = lineElements.value[index]
  if (!container || !line) return
  cancelAnimationFrame(scrollFrame)
  const start = container.scrollTop
  const target = Math.max(0, line.offsetTop - container.clientHeight / 2 + line.offsetHeight / 2)
  const distance = target - start
  const duration = Math.min(900, Math.max(480, Math.abs(distance) * 0.7))
  const startedAt = performance.now()
  const step = (now: number) => {
    const progress = Math.min(1, (now - startedAt) / duration)
    const eased = 1 - Math.pow(1 - progress, 4)
    container.scrollTop = start + distance * eased
    if (progress < 1) scrollFrame = requestAnimationFrame(step)
  }
  scrollFrame = requestAnimationFrame(step)
}

watch(activeIndex, async index => {
  await nextTick()
  animateToLine(index)
})

const setLineElement = (element: unknown, index: number) => {
  if (element instanceof HTMLElement) lineElements.value[index] = element
}
const jumpTo = (line: LyricLine) => player.seek(line.timeSeconds)
const formatTime = (seconds: number) => {
  if (!Number.isFinite(seconds)) return '0:00'
  return `${Math.floor(seconds / 60)}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`
}
const onKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') emitClose()
  if (event.code === 'Space' && !(event.target instanceof HTMLInputElement)) { event.preventDefault(); void player.toggle() }
}
const emit = defineEmits<{ close: [] }>()
const emitClose = () => emit('close')
onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => { window.removeEventListener('keydown', onKeydown); cancelAnimationFrame(scrollFrame) })
</script>

<template>
  <Teleport to="body">
    <section class="lyrics-screen">
      <div class="lyrics-backdrop" :style="player.state.current?.artworkUrl ? { backgroundImage: `url(${player.state.current.artworkUrl})` } : {}" />
      <header class="lyrics-header" data-tauri-drag-region><button title="关闭歌词" aria-label="关闭歌词" @click="emitClose"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></button><strong data-tauri-drag-region>正在播放</strong><span data-tauri-drag-region /></header>
      <div class="lyrics-layout">
        <aside class="lyrics-album">
          <ArtworkImage :src="player.state.current?.artworkUrl" :alt="player.state.current?.name" size="player" />
          <h1>{{ player.state.current?.name }}</h1><p>{{ player.state.current?.artist }}</p><small>{{ player.state.current?.album }}</small>
        </aside>
        <main ref="scrollContainer" class="lyrics-scroll">
          <div v-if="loading" class="lyrics-message">正在加载歌词…</div>
          <div v-else-if="error" class="lyrics-message">{{ error }}</div>
          <button v-for="(line, index) in lines" :key="`${line.timeSeconds}-${index}`" :ref="element => setLineElement(element, index)" class="lyric-line" :class="{ active: index === activeIndex }" @click="jumpTo(line)">{{ line.text }}</button>
        </main>
      </div>
      <footer class="lyrics-player">
        <div class="lyrics-now"><ArtworkImage :src="player.state.current?.artworkUrl" :alt="player.state.current?.name" size="row"/><span><strong>{{ player.state.current?.name }}</strong><small>{{ player.state.current?.artist }}</small></span></div>
        <div class="lyrics-controls"><div><button disabled title="上一首">↶</button><button class="lyrics-play" :disabled="!player.state.current || player.state.loading" @click="player.toggle">{{ player.state.loading ? '…' : player.state.playing ? 'Ⅱ' : '▶' }}</button><button title="下一首" @click="player.playNext">↷</button></div><label><span>{{ formatTime(player.state.currentTime) }}</span><input type="range" min="0" :max="player.state.duration || 1" step="0.1" :value="player.state.currentTime" @input="player.seek(Number(($event.target as HTMLInputElement).value))"/><span>{{ formatTime(player.state.duration) }}</span></label></div>
        <div class="lyrics-volume"><span>◖</span><input type="range" min="0" max="1" step="0.01" :value="player.state.volume" @input="player.setVolume(Number(($event.target as HTMLInputElement).value))"/></div>
      </footer>
    </section>
  </Teleport>
</template>

<style scoped>
.lyrics-header { padding-left: 86px; }
.lyrics-header button { display: grid; place-items: center; padding: 0; line-height: 0; }
.lyrics-header button svg { display: block; width: 20px; height: 20px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
.lyric-line { transform-origin: left center; transition: color .42s ease, opacity .42s ease, transform .55s cubic-bezier(.2,.8,.2,1), font-size .42s cubic-bezier(.2,.8,.2,1), filter .42s ease; }
.lyric-line:not(.active) { opacity: .68; }
.lyric-line.active { transform: translateX(10px) scale(1.025); filter: drop-shadow(0 8px 18px rgba(0,0,0,.28)); }
</style>
