import { computed, ref, watch } from 'vue'
import type { MusicTrack } from '../../types/music'

export interface MusicPlaylist { id: string; name: string; tracks: MusicTrack[]; createdAt: number; updatedAt: number }
interface LibraryData { favorites: MusicTrack[]; recent: MusicTrack[]; playlists: MusicPlaylist[] }
interface LegacyLibraryData { favorites?: MusicTrack[]; recent?: MusicTrack[]; playlist?: MusicTrack[]; playlists?: MusicPlaylist[] }

const key = 'rubia.music.library.v1'
const defaultPlaylist = (tracks: MusicTrack[] = []): MusicPlaylist => ({ id: 'default', name: '默认歌单', tracks, createdAt: 0, updatedAt: Date.now() })
const empty = (): LibraryData => ({ favorites: [], recent: [], playlists: [defaultPlaylist()] })
const validTracks = (value: unknown): MusicTrack[] => Array.isArray(value) ? value : []
const read = (): LibraryData => {
  try {
    const raw = JSON.parse(localStorage.getItem(key) || '{}') as LegacyLibraryData
    const playlists = Array.isArray(raw.playlists) && raw.playlists.length
      ? raw.playlists.filter(item => item && typeof item.id === 'string' && typeof item.name === 'string').map(item => ({ ...item, tracks: validTracks(item.tracks), createdAt: item.createdAt || Date.now(), updatedAt: item.updatedAt || Date.now() }))
      : [defaultPlaylist(validTracks(raw.playlist))]
    return { favorites: validTracks(raw.favorites), recent: validTracks(raw.recent), playlists: playlists.length ? playlists : [defaultPlaylist()] }
  } catch { return empty() }
}

const data = ref(read())
watch(data, value => localStorage.setItem(key, JSON.stringify(value)), { deep: true })
const trackKey = (track: MusicTrack) => `${track.source}:${track.id}`
const contains = (list: MusicTrack[], track: MusicTrack) => list.some(item => trackKey(item) === trackKey(track))
const findPlaylist = (id: string) => data.value.playlists.find(item => item.id === id)

function toggleFavorite(track: MusicTrack) {
  const index = data.value.favorites.findIndex(item => trackKey(item) === trackKey(track))
  index < 0 ? data.value.favorites.unshift(track) : data.value.favorites.splice(index, 1)
}
function createPlaylist(name: string) {
  const normalized = name.trim().slice(0, 30)
  if (!normalized) throw new Error('请输入歌单名称')
  if (data.value.playlists.some(item => item.name.toLocaleLowerCase() === normalized.toLocaleLowerCase())) throw new Error('已经存在同名歌单')
  const now = Date.now()
  const playlist: MusicPlaylist = { id: crypto.randomUUID?.() ?? `playlist_${now}_${Math.random().toString(36).slice(2, 7)}`, name: normalized, tracks: [], createdAt: now, updatedAt: now }
  data.value.playlists.push(playlist)
  return playlist
}
function renamePlaylist(id: string, name: string) {
  const playlist = findPlaylist(id); if (!playlist || id === 'default') return
  const normalized = name.trim().slice(0, 30)
  if (!normalized) throw new Error('请输入歌单名称')
  if (data.value.playlists.some(item => item.id !== id && item.name.toLocaleLowerCase() === normalized.toLocaleLowerCase())) throw new Error('已经存在同名歌单')
  playlist.name = normalized; playlist.updatedAt = Date.now()
}
function deletePlaylist(id: string) {
  if (id === 'default') return
  data.value.playlists = data.value.playlists.filter(item => item.id !== id)
}
function addToPlaylist(track: MusicTrack, playlistId = 'default') {
  const playlist = findPlaylist(playlistId) ?? findPlaylist('default') ?? data.value.playlists[0]
  if (playlist && !contains(playlist.tracks, track)) { playlist.tracks.push(track); playlist.updatedAt = Date.now() }
}
function removeFromPlaylist(track: MusicTrack, playlistId = 'default') {
  const playlist = findPlaylist(playlistId); if (!playlist) return
  playlist.tracks = playlist.tracks.filter(item => trackKey(item) !== trackKey(track)); playlist.updatedAt = Date.now()
}
function isInPlaylist(track: MusicTrack, playlistId: string) { return !!findPlaylist(playlistId)?.tracks.some(item => trackKey(item) === trackKey(track)) }
function recordRecent(track: MusicTrack) {
  data.value.recent = [track, ...data.value.recent.filter(item => trackKey(item) !== trackKey(track))].slice(0, 100)
}
function clearLibrary() { data.value = empty() }

export function useLibrary() {
  return {
    favorites: computed(() => data.value.favorites), recent: computed(() => data.value.recent), playlists: computed(() => data.value.playlists),
    playlist: computed(() => findPlaylist('default')?.tracks ?? []),
    playlistTrackCount: computed(() => data.value.playlists.reduce((total, item) => total + item.tracks.length, 0)),
    isFavorite: (track: MusicTrack) => contains(data.value.favorites, track), isInPlaylist, toggleFavorite,
    createPlaylist, renamePlaylist, deletePlaylist, addToPlaylist, removeFromPlaylist, recordRecent, clearLibrary,
  }
}
