export interface MusicTrack {
  id: string
  title: string
  artist: string
  style: 'ethiopian-jazz' | 'traditional-modern' | 'afrobeat' | 'electronic' | 'cinematic'
  durationSeconds: number
  rights: 'original' | 'licensed' | 'placeholder'
  enabled: boolean
}

export const ORIGINAL_MUSIC_PLAYLIST: MusicTrack[] = [
  { id: 'efu-horizon', title: 'Addis Horizon', artist: 'EFU Original Score', style: 'ethiopian-jazz', durationSeconds: 168, rights: 'placeholder', enabled: true },
  { id: 'walia-rise', title: 'Walia Rise', artist: 'EFU Original Score', style: 'cinematic', durationSeconds: 144, rights: 'placeholder', enabled: true },
  { id: 'highland-press', title: 'Highland Press', artist: 'EFU Original Score', style: 'electronic', durationSeconds: 156, rights: 'placeholder', enabled: true },
  { id: 'kebero-night', title: 'Kebero Night', artist: 'EFU Original Score', style: 'traditional-modern', durationSeconds: 174, rights: 'placeholder', enabled: true },
]

export class MusicPlaylistManager {
  private index = 0
  private disabled = new Set<string>()
  current() { return this.available()[this.index % Math.max(1, this.available().length)] ?? null }
  next() { const list = this.available(); this.index = list.length ? (this.index + 1) % list.length : 0; return this.current() }
  previous() { const list = this.available(); this.index = list.length ? (this.index - 1 + list.length) % list.length : 0; return this.current() }
  disable(id: string) { this.disabled.add(id) }
  enable(id: string) { this.disabled.delete(id) }
  shuffle() { const list = this.available(); this.index = list.length ? Math.floor(Math.random() * list.length) : 0; return this.current() }
  private available() { return ORIGINAL_MUSIC_PLAYLIST.filter((track) => track.enabled && !this.disabled.has(track.id)) }
}
