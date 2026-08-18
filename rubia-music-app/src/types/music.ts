export type Quality = '128k' | '320k' | 'flac' | 'flac24bit'
export interface MusicTrack { id: string; name: string; artist: string; album: string; durationSeconds: number; source: string; artworkUrl: string | null; qualities: Quality[]; sourceData: Record<string, unknown> }
export interface SourceCapabilities { sources: Record<string, { type: 'music'; actions: Array<'musicUrl' | 'lyric' | 'pic'>; qualitys: Quality[] }> }
