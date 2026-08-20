<script setup lang="ts">
import { ref, watch } from 'vue'
import { sourceDebug, sourceDebugError } from '../features/sources/sourceDebug'
import AppIcon from './AppIcon.vue'

const props = withDefaults(defineProps<{ src?: string | null; alt?: string; size?: 'row' | 'player' }>(), {
  src: null,
  alt: '',
  size: 'row',
})
const failed = ref(false)
watch(() => props.src, () => { failed.value = false })
const loaded = () => sourceDebug('artwork:loaded', { src: props.src, alt: props.alt })
const loadFailed = (event: Event) => {
  failed.value = true
  const image = event.currentTarget as HTMLImageElement
  sourceDebugError('artwork:failed', { src: props.src, currentSrc: image.currentSrc, naturalWidth: image.naturalWidth, naturalHeight: image.naturalHeight })
}
</script>

<template>
  <span class="artwork" :class="`artwork-${size}`">
    <img v-if="src && !failed" :key="src" :src="src" :alt="alt" loading="lazy" decoding="async" referrerpolicy="no-referrer" @load="loaded" @error="loadFailed" />
    <AppIcon v-else name="music" :size="size === 'player' ? 24 : 18" />
  </span>
</template>
