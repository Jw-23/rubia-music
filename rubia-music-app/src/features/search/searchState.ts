import { ref, watch } from 'vue'
import type { MusicTrack } from '../../types/music'

const storageKey = 'rubia.music.search.v1'
const saved = (() => {
  try { return JSON.parse(localStorage.getItem(storageKey) || '{}') as { query?: string; results?: MusicTrack[]; searched?: boolean } }
  catch { return {} }
})()

export const searchQuery = ref(saved.query || '')
export const searchResults = ref(Array.isArray(saved.results) ? saved.results : [])
export const searchPerformed = ref(Boolean(saved.searched))
export const searchLoading = ref(false)
export const searchError = ref('')

watch([searchQuery, searchResults, searchPerformed], () => {
  localStorage.setItem(storageKey, JSON.stringify({ query: searchQuery.value, results: searchResults.value, searched: searchPerformed.value }))
}, { deep: true })
