import { computed, ref, watch } from 'vue'
import type { MusicTrack } from '../../types/music'

interface LibraryData { favorites: MusicTrack[]; recent: MusicTrack[]; playlist: MusicTrack[] }
const key = 'rubia.music.library.v1'
const empty = (): LibraryData => ({ favorites: [], recent: [], playlist: [] })
const read = (): LibraryData => {
  try { return { ...empty(), ...JSON.parse(localStorage.getItem(key) || '{}') } }
  catch { return empty() }
}
const data = ref(read())
watch(data, value => localStorage.setItem(key, JSON.stringify(value)), { deep: true })
const trackKey = (track: MusicTrack) => `${track.source}:${track.id}`
const contains = (list: MusicTrack[], track: MusicTrack) => list.some(item => trackKey(item) === trackKey(track))

function toggleFavorite(track: MusicTrack) {
  const index = data.value.favorites.findIndex(item => trackKey(item) === trackKey(track))
  index < 0 ? data.value.favorites.unshift(track) : data.value.favorites.splice(index, 1)
}
function addToPlaylist(track: MusicTrack) { if (!contains(data.value.playlist, track)) data.value.playlist.push(track) }
function removeFromPlaylist(track: MusicTrack) { data.value.playlist = data.value.playlist.filter(item => trackKey(item) !== trackKey(track)) }
function recordRecent(track: MusicTrack) {
  data.value.recent = [track, ...data.value.recent.filter(item => trackKey(item) !== trackKey(track))].slice(0, 100)
}

export function useLibrary() {
  return {
    favorites: computed(() => data.value.favorites), recent: computed(() => data.value.recent), playlist: computed(() => data.value.playlist),
    isFavorite: (track: MusicTrack) => contains(data.value.favorites, track), toggleFavorite, addToPlaylist, removeFromPlaylist, recordRecent,
  }
}
