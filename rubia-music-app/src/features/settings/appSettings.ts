import { reactive, watch } from 'vue'
import type { Quality } from '../../types/music'

export interface AppSettings {
  playbackQuality: Quality
  fallbackToBuiltin: boolean
  volume: number
  lyricFontSize: number
  smoothLyrics: boolean
  showLyricArtwork: boolean
  reduceMotion: boolean
}
const key = 'rubia.music.settings.v1'
const defaults: AppSettings = { playbackQuality: '128k', fallbackToBuiltin: true, volume: .82, lyricFontSize: 28, smoothLyrics: true, showLyricArtwork: true, reduceMotion: false }
const load = (): AppSettings => {
  try { return { ...defaults, ...JSON.parse(localStorage.getItem(key) || '{}') } }
  catch { return { ...defaults } }
}
export const appSettings = reactive(load())
const apply = () => document.documentElement.classList.toggle('reduce-motion', appSettings.reduceMotion)
watch(appSettings, value => { localStorage.setItem(key, JSON.stringify(value)); apply() }, { deep: true })
apply()
export const resetAppSettings = () => Object.assign(appSettings, defaults)
