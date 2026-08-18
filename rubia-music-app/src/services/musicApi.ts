import { invoke } from '@tauri-apps/api/core'
import type { MusicTrack, Quality } from '../types/music'
export const searchMusic = (query: string) => invoke<MusicTrack[]>('search_music', { query, page: 1, limit: 30 })
export const resolveBuiltinUrl = (track: MusicTrack, quality: Quality) => invoke<string>('resolve_music_url', { track, quality })
