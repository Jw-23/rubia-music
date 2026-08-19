import type { MusicTrack, Quality } from '../../types/music'
import { appSettings } from '../settings/appSettings'

// Keep the default conservative until playback quality becomes a user setting.
export const defaultPlaybackQuality: Quality = '128k'
const preference = () => Array.from(new Set<Quality>([appSettings.playbackQuality, '128k', '320k', 'flac', 'flac24bit']))

export function selectTrackQuality(track: MusicTrack) {
  return preference().find(quality => track.qualities.includes(quality)) ?? defaultPlaybackQuality
}

export function selectSourceQualities(supports: (quality: Quality) => boolean) {
  // The custom source is authoritative. Search providers sometimes omit 128k
  // from their metadata even though LX-compatible sources can resolve it.
  return preference().filter(supports)
}
