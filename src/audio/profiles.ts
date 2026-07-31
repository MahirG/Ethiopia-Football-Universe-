import { clubs } from '../data/clubs'
import type { AudioLanguage, ClubAudioProfile, StadiumAudioProfile } from './types'

const languageForRegion = (region: string): AudioLanguage => {
  if (region.includes('Oromia')) return 'om'
  if (region.includes('Tigray')) return 'ti'
  if (region.includes('Somali')) return 'so'
  return 'am'
}

const stadiumSeed: Record<string, Partial<StadiumAudioProfile>> = {
  'Addis Ababa': { openness: 0.72, roofCoverage: 0.22, crowdProximity: 0.7, reverbSeconds: 1.65, earlyReflections: 0.58, paEchoMs: 145, environment: 'urban' },
  'Bahir Dar': { openness: 0.9, roofCoverage: 0.1, crowdProximity: 0.74, reverbSeconds: 1.28, earlyReflections: 0.42, paEchoMs: 118, environment: 'lakeside' },
  Hawassa: { openness: 0.86, roofCoverage: 0.12, crowdProximity: 0.78, reverbSeconds: 1.34, earlyReflections: 0.45, paEchoMs: 124, environment: 'lakeside' },
  Adama: { openness: 0.92, roofCoverage: 0.08, crowdProximity: 0.7, reverbSeconds: 1.15, earlyReflections: 0.36, paEchoMs: 104, environment: 'warm-dry' },
  'Dire Dawa': { openness: 0.94, roofCoverage: 0.06, crowdProximity: 0.68, reverbSeconds: 1.08, earlyReflections: 0.32, paEchoMs: 98, environment: 'warm-dry' },
  Jimma: { openness: 0.84, roofCoverage: 0.1, crowdProximity: 0.82, reverbSeconds: 1.42, earlyReflections: 0.48, paEchoMs: 126, environment: 'green' },
  Gondar: { openness: 0.82, roofCoverage: 0.14, crowdProximity: 0.76, reverbSeconds: 1.46, earlyReflections: 0.5, paEchoMs: 132, environment: 'highland' },
  Mekelle: { openness: 0.88, roofCoverage: 0.1, crowdProximity: 0.74, reverbSeconds: 1.3, earlyReflections: 0.44, paEchoMs: 116, environment: 'highland' },
  Bishoftu: { openness: 0.9, roofCoverage: 0.08, crowdProximity: 0.76, reverbSeconds: 1.2, earlyReflections: 0.38, paEchoMs: 106, environment: 'lakeside' },
  Shashemene: { openness: 0.9, roofCoverage: 0.08, crowdProximity: 0.8, reverbSeconds: 1.22, earlyReflections: 0.4, paEchoMs: 108, environment: 'green' },
  Sodo: { openness: 0.86, roofCoverage: 0.1, crowdProximity: 0.84, reverbSeconds: 1.36, earlyReflections: 0.46, paEchoMs: 118, environment: 'green' },
}

export const STADIUM_AUDIO_PROFILES: StadiumAudioProfile[] = Array.from(new Map(clubs.map((club) => [club.stadium, club])).values()).map((club) => {
  const defaults = stadiumSeed[club.city] ?? { openness: 0.86, roofCoverage: 0.1, crowdProximity: 0.74, reverbSeconds: 1.3, earlyReflections: 0.42, paEchoMs: 116, environment: 'urban' as const }
  return {
    id: club.stadium.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    name: club.stadium,
    city: club.city,
    capacity: club.capacity,
    openness: defaults.openness ?? 0.86,
    roofCoverage: defaults.roofCoverage ?? 0.1,
    crowdProximity: defaults.crowdProximity ?? 0.74,
    reverbSeconds: defaults.reverbSeconds ?? 1.3,
    earlyReflections: defaults.earlyReflections ?? 0.42,
    paEchoMs: defaults.paEchoMs ?? 116,
    environment: defaults.environment ?? 'urban',
    crowdLoudness: Math.min(1, 0.52 + club.support / 190),
  }
})

const rivals: Record<string, string[]> = {
  'saint-george': ['ethiopian-coffee', 'defence-force'],
  'ethiopian-coffee': ['saint-george', 'cbe'],
  'bahir-dar-city': ['fasil-city'],
  'fasil-city': ['bahir-dar-city'],
  'hawassa-city': ['sidama-coffee'],
  'sidama-coffee': ['hawassa-city'],
  'adama-city': ['negele-arsi'],
  'mekele-70-enderta': ['welwalo-adigrat', 'dedebit'],
}

export const CLUB_AUDIO_PROFILES: ClubAudioProfile[] = clubs.map((club, index) => {
  const primary = languageForRegion(club.region)
  const name = club.amharicName ?? club.name
  return {
    clubId: club.id,
    name: club.name,
    shortName: club.shortName,
    nickname: club.shortName,
    city: club.city,
    stadiumId: club.stadium.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    primaryLanguage: primary,
    secondaryLanguages: Array.from(new Set<AudioLanguage>([primary, 'am', 'en'])),
    homeChants: [`${name}! ${name}!`, `${club.shortName}! ${club.shortName}!`, 'እንሸንፋለን!'],
    awayChants: [`${club.shortName}!`, 'ቡድናችን ወደፊት!'],
    goalChant: `ጎል! ${name}!`,
    drumStyle: index % 4 === 0 ? 'kebero' : index % 4 === 1 ? 'hand-clap' : index % 4 === 2 ? 'horn-led' : 'mixed',
    crowdEnergy: Math.min(1, club.support / 92),
    supporterDensity: Math.min(1, 0.48 + club.capacity / 55000),
    loyalty: Math.min(1, 0.56 + club.reputation / 210),
    rivals: rivals[club.id] ?? [],
    pronunciation: name,
  }
})

export const stadiumProfile = (stadiumName: string) => STADIUM_AUDIO_PROFILES.find((profile) => profile.name === stadiumName) ?? STADIUM_AUDIO_PROFILES[0]
export const clubAudioProfile = (clubId: string) => CLUB_AUDIO_PROFILES.find((profile) => profile.clubId === clubId) ?? CLUB_AUDIO_PROFILES[0]
