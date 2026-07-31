import type { AudioLanguage, AudioQuality } from './types'

export type AssetRightsStatus = 'original' | 'licensed' | 'public-domain' | 'commissioned' | 'placeholder'

export interface AudioAssetRecord {
  id: string
  path: string
  category: string
  language?: AudioLanguage
  quality: AudioQuality[]
  stream: boolean
  rights: AssetRightsStatus
  creator: string
  license: string
  platforms: string[]
  replacementRequired: boolean
}

export class AudioAssetDatabase {
  private records = new Map<string, AudioAssetRecord>()
  private buffers = new Map<string, AudioBuffer>()
  private loading = new Map<string, Promise<AudioBuffer | null>>()

  register(records: AudioAssetRecord[]) {
    records.forEach((record) => this.records.set(record.id, record))
  }

  record(id: string) {
    return this.records.get(id)
  }

  async load(id: string, context: AudioContext) {
    if (this.buffers.has(id)) return this.buffers.get(id) ?? null
    if (this.loading.has(id)) return this.loading.get(id) ?? null
    const record = this.records.get(id)
    if (!record || record.rights === 'placeholder') return null
    const task = fetch(record.path)
      .then((response) => response.ok ? response.arrayBuffer() : Promise.reject(new Error(`Audio asset ${id} returned ${response.status}`)))
      .then((bytes) => context.decodeAudioData(bytes))
      .then((buffer) => { this.buffers.set(id, buffer); return buffer })
      .catch(() => null)
      .finally(() => this.loading.delete(id))
    this.loading.set(id, task)
    return task
  }

  unloadLanguage(language: AudioLanguage) {
    for (const [id, record] of this.records) if (record.language === language) this.buffers.delete(id)
  }

  missing() {
    return [...this.records.values()].filter((record) => record.replacementRequired || record.rights === 'placeholder')
  }

  memoryBytes() {
    let bytes = 0
    for (const buffer of this.buffers.values()) bytes += buffer.length * buffer.numberOfChannels * 4
    return bytes
  }
}

export const LEGAL_PLACEHOLDER_ASSETS: AudioAssetRecord[] = [
  { id: 'chant.walia.main', path: '/Audio/Crowd/Chants/CHANT_Walia_Main_01.wav', category: 'chant', language: 'am', quality: ['medium','high','ultra'], stream: false, rights: 'placeholder', creator: 'TBD commissioned performers', license: 'Pending performer releases', platforms: ['web','android','ios','pc','console'], replacementRequired: true },
  { id: 'anthem.ethiopia.official', path: '/Audio/Music/Anthems/ANTHEM_Ethiopia_Official.wav', category: 'anthem', quality: ['high','ultra'], stream: true, rights: 'placeholder', creator: 'TBD licensed recording', license: 'Official recording license required', platforms: ['web','android','ios','pc','console'], replacementRequired: true },
  { id: 'commentary.am.goal.001', path: '/Audio/Commentary/Amharic/VO_AMH_Goal_Generic_001.wav', category: 'commentary', language: 'am', quality: ['medium','high','ultra'], stream: false, rights: 'placeholder', creator: 'TBD voice actor', license: 'Commission and voice release required', platforms: ['web','android','ios','pc','console'], replacementRequired: true },
]
