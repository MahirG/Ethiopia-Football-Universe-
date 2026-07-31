import type { PlayerProfile, PlayerRole, TeamSide } from './types'

const SKINS = ['#3f241d', '#513027', '#633a2d', '#764632', '#8a583e', '#9f6749', '#b37759', '#c78d70']
const UNDERTONES = ['#b96f54', '#a05d45', '#8a4f3a', '#d58b68']
const HAIRS = ['#0c0d0c', '#171411', '#241c17', '#38291f']
const EYES = ['#21170f', '#38261a', '#4a3323', '#5b3f2a']

function seeded(seed: number, salt: number) {
  const value = Math.sin(seed * 91.733 + salt * 37.719) * 43758.5453
  return value - Math.floor(value)
}

function range(seed: number, salt: number, min: number, max: number) {
  return min + seeded(seed, salt) * (max - min)
}

export function roleForIndex(index: number): PlayerRole {
  if (index === 0) return 'goalkeeper'
  if ([1, 4].includes(index)) return 'fullback'
  if ([2, 3].includes(index)) return 'centre-back'
  if ([5, 6, 7].includes(index)) return 'midfielder'
  if ([8, 10].includes(index)) return 'winger'
  return 'striker'
}

function roleBody(role: PlayerRole) {
  switch (role) {
    case 'goalkeeper': return { height: 1.91, mass: 84, shoulder: 0.49, muscle: 0.72, speed: 0.65, strength: 0.78 }
    case 'centre-back': return { height: 1.87, mass: 82, shoulder: 0.5, muscle: 0.78, speed: 0.67, strength: 0.85 }
    case 'fullback': return { height: 1.78, mass: 73, shoulder: 0.44, muscle: 0.68, speed: 0.83, strength: 0.68 }
    case 'midfielder': return { height: 1.79, mass: 74, shoulder: 0.45, muscle: 0.66, speed: 0.78, strength: 0.66 }
    case 'winger': return { height: 1.75, mass: 69, shoulder: 0.42, muscle: 0.61, speed: 0.91, strength: 0.57 }
    default: return { height: 1.82, mass: 77, shoulder: 0.47, muscle: 0.73, speed: 0.84, strength: 0.77 }
  }
}

export function createPlayerProfile(index: number, team: TeamSide): PlayerProfile {
  const seed = index + (team === 'away' ? 40 : 0) + 1
  const role = roleForIndex(index)
  const base = roleBody(role)
  const height = base.height + range(seed, 1, -0.055, 0.055)
  const age = Math.round(range(seed, 2, 19, 35))
  const veteranFactor = Math.max(0, (age - 29) / 9)
  const primeFactor = 1 - Math.abs(age - 27) / 16
  const skinIndex = Math.floor(seeded(seed, 3) * SKINS.length) % SKINS.length
  const preferredFoot = seeded(seed, 4) < 0.22 ? 'left' : 'right'
  const technical = range(seed, 5, 0.54, 0.91)
  const physical = range(seed, 6, 0.56, 0.91)
  const mentality = range(seed, 7, 0.5, 0.94)

  return {
    id: `${team}-${index}`,
    number: index + 1,
    role,
    team,
    preferredFoot,
    body: {
      height,
      mass: base.mass + range(seed, 8, -6, 6),
      shoulderWidth: base.shoulder + range(seed, 9, -0.025, 0.025),
      hipWidth: range(seed, 10, 0.31, 0.39),
      torsoLength: range(seed, 11, 0.53, 0.64),
      upperLegLength: range(seed, 12, 0.43, 0.51),
      lowerLegLength: range(seed, 13, 0.42, 0.5),
      upperArmLength: range(seed, 14, 0.29, 0.35),
      lowerArmLength: range(seed, 15, 0.26, 0.32),
      neckLength: range(seed, 16, 0.105, 0.15),
      neckThickness: range(seed, 17, 0.095, 0.125),
      handScale: range(seed, 18, 0.92, 1.1),
      footLength: range(seed, 19, 0.255, 0.295),
      muscle: Math.min(0.96, base.muscle + range(seed, 20, -0.08, 0.08)),
      bodyFat: range(seed, 21, 0.07, 0.16),
      asymmetry: range(seed, 22, -0.025, 0.025),
      age,
    },
    face: {
      skinTone: SKINS[skinIndex],
      undertone: UNDERTONES[Math.floor(seeded(seed, 23) * UNDERTONES.length) % UNDERTONES.length],
      hairTone: HAIRS[Math.floor(seeded(seed, 24) * HAIRS.length) % HAIRS.length],
      eyeTone: EYES[Math.floor(seeded(seed, 25) * EYES.length) % EYES.length],
      faceWidth: range(seed, 26, 0.88, 1.12),
      jawWidth: range(seed, 27, 0.82, 1.16),
      cheekHeight: range(seed, 28, 0.88, 1.15),
      noseLength: range(seed, 29, 0.82, 1.2),
      noseWidth: range(seed, 30, 0.82, 1.18),
      lipFullness: range(seed, 31, 0.78, 1.25),
      foreheadHeight: range(seed, 32, 0.86, 1.16),
      earScale: range(seed, 33, 0.86, 1.14),
      eyeSpacing: range(seed, 34, 0.9, 1.1),
      eyeScale: range(seed, 35, 0.88, 1.12),
      hairStyle: (['fade', 'short-curl', 'coiled', 'braids', 'afro', 'shaved'] as const)[Math.floor(seeded(seed, 36) * 6) % 6],
      beardStyle: age < 22 ? 'none' : (['none', 'stubble', 'short', 'goatee'] as const)[Math.floor(seeded(seed, 37) * 4) % 4],
      scar: seeded(seed, 38) < 0.15 ? range(seed, 39, 0.2, 0.8) : 0,
      freckles: seeded(seed, 40) < 0.18 ? range(seed, 41, 0.2, 0.75) : 0,
    },
    personality: {
      aggression: range(seed, 42, 0.28, 0.88),
      composure: Math.min(0.98, mentality + range(seed, 43, -0.1, 0.08)),
      confidence: range(seed, 44, 0.46, 0.91),
      leadership: age > 29 ? range(seed, 45, 0.58, 0.94) : range(seed, 45, 0.25, 0.72),
      selflessness: range(seed, 46, 0.35, 0.92),
      creativity: range(seed, 47, 0.32, 0.94),
      discipline: range(seed, 48, 0.4, 0.94),
      bravery: range(seed, 49, 0.48, 0.96),
      patience: range(seed, 50, 0.35, 0.9),
      sportsmanship: range(seed, 51, 0.42, 0.96),
      emotionalControl: range(seed, 52, 0.36, 0.95),
      riskTolerance: range(seed, 53, 0.28, 0.92),
      workRate: range(seed, 54, 0.5, 0.97),
      loyalty: range(seed, 55, 0.45, 0.98),
    },
    ability: {
      acceleration: Math.max(0.48, base.speed + range(seed, 56, -0.09, 0.08) - veteranFactor * 0.09),
      sprintSpeed: Math.max(0.5, base.speed + range(seed, 57, -0.08, 0.08) - veteranFactor * 0.08),
      agility: Math.max(0.45, technical + range(seed, 58, -0.12, 0.1) - Math.max(0, height - 1.84) * 0.35),
      balance: Math.min(0.97, physical + range(seed, 59, -0.1, 0.1)),
      strength: Math.min(0.98, base.strength + range(seed, 60, -0.1, 0.08)),
      stamina: Math.min(0.98, 0.67 + primeFactor * 0.2 + range(seed, 61, -0.08, 0.08)),
      reactions: Math.min(0.98, mentality + range(seed, 62, -0.08, 0.08)),
      vision: role === 'midfielder' ? Math.min(0.98, technical + 0.08) : technical,
      firstTouch: Math.min(0.98, technical + range(seed, 63, -0.08, 0.08)),
      passing: role === 'midfielder' ? Math.min(0.98, technical + 0.07) : technical,
      shooting: role === 'striker' ? Math.min(0.98, technical + 0.08) : Math.max(0.42, technical - 0.06),
      dribbling: ['winger', 'midfielder'].includes(role) ? Math.min(0.98, technical + 0.06) : technical,
      tackling: ['centre-back', 'fullback'].includes(role) ? Math.min(0.98, physical + 0.06) : Math.max(0.38, physical - 0.14),
      heading: ['centre-back', 'striker', 'goalkeeper'].includes(role) ? Math.min(0.98, physical + 0.08) : physical,
      weakFoot: range(seed, 64, 0.35, 0.88),
      goalkeeper: role === 'goalkeeper' ? range(seed, 65, 0.72, 0.94) : range(seed, 65, 0.08, 0.2),
    },
    movement: {
      strideScale: range(seed, 66, 0.88, 1.14),
      cadenceScale: range(seed, 67, 0.88, 1.12),
      armSwing: range(seed, 68, 0.72, 1.16),
      torsoLean: range(seed, 69, 0.86, 1.16),
      scanFrequency: range(seed, 70, 0.65, 1.35),
      touchRhythm: range(seed, 71, 0.8, 1.2),
      celebrationStyle: Math.floor(seeded(seed, 72) * 5),
      posture: range(seed, 73, -0.08, 0.08),
    },
  }
}
