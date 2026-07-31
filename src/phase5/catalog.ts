import type { CompetitiveSettings, ExternalAssetSlot, RefereeProfile, SetPieceRoutine, TacticalPreset } from './types'

export const ASSET_TIERS = [
  { id: 'procedural', name: 'Procedural web runtime' },
  { id: 'production-ready', name: 'Production GLTF / KTX2' },
  { id: 'cinematic', name: 'Cinematic scan pipeline' },
] as const

export const TACTICAL_PRESETS: TacticalPreset[] = [
  { id: 'balanced-433', name: 'Balanced 4-3-3', formation: '4-3-3', mentality: 'balanced', lineHeight: 0.52, width: 0.58, compactness: 0.62, pressIntensity: 0.56, tempo: 0.56, directness: 0.48, risk: 0.45, counterPress: 0.56, restDefense: 0.62 },
  { id: 'possession-433', name: 'Possession 4-3-3', formation: '4-3-3', mentality: 'positive', lineHeight: 0.64, width: 0.66, compactness: 0.72, pressIntensity: 0.62, tempo: 0.48, directness: 0.3, risk: 0.58, counterPress: 0.72, restDefense: 0.68 },
  { id: 'high-press-4231', name: 'High Press 4-2-3-1', formation: '4-2-3-1', mentality: 'attacking', lineHeight: 0.78, width: 0.58, compactness: 0.78, pressIntensity: 0.92, tempo: 0.78, directness: 0.58, risk: 0.74, counterPress: 0.9, restDefense: 0.52 },
  { id: 'low-block-541', name: 'Low Block 5-4-1', formation: '5-4-1', mentality: 'defensive', lineHeight: 0.26, width: 0.48, compactness: 0.92, pressIntensity: 0.28, tempo: 0.38, directness: 0.68, risk: 0.18, counterPress: 0.24, restDefense: 0.9 },
  { id: 'counter-442', name: 'Counter 4-4-2', formation: '4-4-2', mentality: 'positive', lineHeight: 0.42, width: 0.62, compactness: 0.68, pressIntensity: 0.5, tempo: 0.82, directness: 0.82, risk: 0.56, counterPress: 0.42, restDefense: 0.72 },
  { id: 'wide-overload-343', name: 'Wide Overload 3-4-3', formation: '3-4-3', mentality: 'attacking', lineHeight: 0.7, width: 0.92, compactness: 0.52, pressIntensity: 0.72, tempo: 0.7, directness: 0.62, risk: 0.82, counterPress: 0.76, restDefense: 0.42 },
]

export const REFEREE_PROFILES: RefereeProfile[] = [
  { id: 'balanced', name: 'Balanced international', strictness: 0.55, advantageBias: 0.62, cardThreshold: 0.62, penaltyThreshold: 0.58, varInterventionThreshold: 0.7, communication: 0.74, fitness: 0.84 },
  { id: 'strict', name: 'Strict disciplinarian', strictness: 0.84, advantageBias: 0.34, cardThreshold: 0.48, penaltyThreshold: 0.5, varInterventionThreshold: 0.64, communication: 0.68, fitness: 0.78 },
  { id: 'flow', name: 'Flow-first referee', strictness: 0.38, advantageBias: 0.86, cardThreshold: 0.72, penaltyThreshold: 0.66, varInterventionThreshold: 0.78, communication: 0.8, fitness: 0.88 },
  { id: 'elite-var', name: 'Elite VAR team', strictness: 0.6, advantageBias: 0.68, cardThreshold: 0.58, penaltyThreshold: 0.55, varInterventionThreshold: 0.56, communication: 0.9, fitness: 0.94 },
]

export const SET_PIECE_ROUTINES: SetPieceRoutine[] = [
  { id: 'kickoff-standard', name: 'Standard kick-off', restart: 'kickoff', attackingTeamShape: 'short', deliveryHeight: 0.1, power: 0.26, curve: 0, targetZone: [7, 2], requiredPlayers: 2, risk: 0.1 },
  { id: 'corner-near', name: 'Near-post surge', restart: 'corner', attackingTeamShape: 'near-post', deliveryHeight: 1.8, power: 0.72, curve: 0.58, targetZone: [5.2, 2.1], requiredPlayers: 5, risk: 0.62 },
  { id: 'corner-far', name: 'Far-post overload', restart: 'corner', attackingTeamShape: 'far-post', deliveryHeight: 2.2, power: 0.78, curve: 0.72, targetZone: [5.8, -2.8], requiredPlayers: 5, risk: 0.58 },
  { id: 'corner-short', name: 'Short corner triangle', restart: 'corner', attackingTeamShape: 'short', deliveryHeight: 0.3, power: 0.34, curve: 0.18, targetZone: [8.5, 6], requiredPlayers: 3, risk: 0.38 },
  { id: 'corner-edge', name: 'Edge-of-box cutback', restart: 'corner', attackingTeamShape: 'edge', deliveryHeight: 0.7, power: 0.58, curve: 0.36, targetZone: [16.5, 0], requiredPlayers: 4, risk: 0.48 },
  { id: 'free-direct', name: 'Direct free kick', restart: 'direct-free-kick', attackingTeamShape: 'direct', deliveryHeight: 1.2, power: 0.88, curve: 0.68, targetZone: [0, 1.7], requiredPlayers: 2, risk: 0.52 },
  { id: 'free-cross', name: 'Free-kick cross', restart: 'direct-free-kick', attackingTeamShape: 'cross', deliveryHeight: 2.3, power: 0.72, curve: 0.52, targetZone: [7, 1.8], requiredPlayers: 5, risk: 0.46 },
  { id: 'free-layoff', name: 'Indirect layoff', restart: 'indirect-free-kick', attackingTeamShape: 'short', deliveryHeight: 0.15, power: 0.22, curve: 0, targetZone: [2, 0], requiredPlayers: 3, risk: 0.28 },
  { id: 'throw-quick', name: 'Quick throw', restart: 'throw-in', attackingTeamShape: 'short', deliveryHeight: 1.5, power: 0.42, curve: 0, targetZone: [5, 4], requiredPlayers: 2, risk: 0.34 },
  { id: 'throw-target', name: 'Target-player throw', restart: 'throw-in', attackingTeamShape: 'target', deliveryHeight: 2.2, power: 0.68, curve: 0, targetZone: [9, 1], requiredPlayers: 4, risk: 0.52 },
  { id: 'goal-kick-short', name: 'Short build-up', restart: 'goal-kick', attackingTeamShape: 'short', deliveryHeight: 0.25, power: 0.46, curve: 0, targetZone: [12, 8], requiredPlayers: 4, risk: 0.48 },
  { id: 'goal-kick-long', name: 'Long release', restart: 'goal-kick', attackingTeamShape: 'long', deliveryHeight: 3.2, power: 0.94, curve: 0.12, targetZone: [36, 6], requiredPlayers: 5, risk: 0.38 },
  { id: 'penalty-placed', name: 'Placed penalty', restart: 'penalty', attackingTeamShape: 'placed', deliveryHeight: 0.6, power: 0.78, curve: 0.18, targetZone: [0, 2.1], requiredPlayers: 1, risk: 0.42 },
  { id: 'penalty-power', name: 'Power penalty', restart: 'penalty', attackingTeamShape: 'power', deliveryHeight: 0.85, power: 1, curve: 0.08, targetZone: [0, -2.4], requiredPlayers: 1, risk: 0.56 },
]

export const EXTERNAL_ASSET_SLOTS: ExternalAssetSlot[] = [
  { id: 'player-gameplay-lod0', kind: 'player-model', format: 'glb', path: '/assets/players/gameplay/player-lod0.glb', requiredBones: ['Hips', 'Spine', 'Head', 'LeftFoot', 'RightFoot', 'LeftHand', 'RightHand'], maxBytes: 18_000_000, lod: 'gameplay', licensed: false, fallback: 'procedural-human-player' },
  { id: 'player-broadcast-lod0', kind: 'player-model', format: 'glb', path: '/assets/players/broadcast/player-lod0.glb', requiredBones: ['Hips', 'Spine', 'Neck', 'Head', 'LeftFoot', 'RightFoot', 'LeftHand', 'RightHand'], maxBytes: 38_000_000, lod: 'broadcast', licensed: false, fallback: 'procedural-human-player' },
  { id: 'player-cinematic-lod0', kind: 'player-model', format: 'glb', path: '/assets/players/cinematic/player-lod0.glb', requiredBones: ['Hips', 'Spine', 'Chest', 'Neck', 'Head', 'Jaw', 'LeftFoot', 'RightFoot', 'LeftHand', 'RightHand'], maxBytes: 72_000_000, lod: 'cinematic', licensed: false, fallback: 'procedural-human-player' },
  { id: 'facial-facs-rig', kind: 'facial-rig', format: 'gltf', path: '/assets/players/facial/facs-rig.gltf', requiredAnimations: ['blink', 'focus', 'shout', 'strain', 'smile', 'frustration'], maxBytes: 12_000_000, lod: 'cinematic', licensed: false, fallback: 'procedural-face-rig' },
  { id: 'mocap-locomotion', kind: 'mocap', format: 'fbx', path: '/assets/mocap/locomotion/football-locomotion.fbx', requiredAnimations: ['idle', 'walk', 'jog', 'sprint', 'cut-left', 'cut-right', 'brake', 'backpedal'], maxBytes: 42_000_000, lod: 'gameplay', licensed: false, fallback: 'procedural-biomechanics' },
  { id: 'mocap-ball-actions', kind: 'mocap', format: 'fbx', path: '/assets/mocap/ball/football-actions.fbx', requiredAnimations: ['short-pass', 'driven-pass', 'shot', 'volley', 'header', 'tackle', 'throw-in', 'free-kick', 'penalty'], maxBytes: 48_000_000, lod: 'gameplay', licensed: false, fallback: 'procedural-contact-animation' },
  { id: 'kit-material-pack', kind: 'kit-material', format: 'ktx2', path: '/assets/materials/kits/kit-pack.ktx2', maxBytes: 24_000_000, lod: 'broadcast', licensed: false, fallback: 'procedural-kit-material' },
  { id: 'stadium-material-pack', kind: 'stadium-material', format: 'ktx2', path: '/assets/materials/stadiums/stadium-pack.ktx2', maxBytes: 36_000_000, lod: 'broadcast', licensed: false, fallback: 'procedural-stadium-material' },
  { id: 'ball-material-pack', kind: 'ball-material', format: 'basis', path: '/assets/materials/balls/ball-pack.basis', maxBytes: 10_000_000, lod: 'broadcast', licensed: false, fallback: 'procedural-ball-material' },
]

export const DEFAULT_COMPETITIVE_SETTINGS: CompetitiveSettings = {
  homeTacticId: 'balanced-433',
  awayTacticId: 'balanced-433',
  homeCornerRoutineId: 'corner-near',
  awayCornerRoutineId: 'corner-far',
  homeFreeKickRoutineId: 'free-direct',
  awayFreeKickRoutineId: 'free-cross',
  refereeProfileId: 'balanced',
  varEnabled: true,
  automaticRestarts: true,
  visibleOffsideLines: true,
  refereeAssistance: true,
  assetTier: 'procedural',
}

export function getTacticalPreset(id: string) {
  return TACTICAL_PRESETS.find((item) => item.id === id) ?? TACTICAL_PRESETS[0]
}

export function getRefereeProfile(id: string) {
  return REFEREE_PROFILES.find((item) => item.id === id) ?? REFEREE_PROFILES[0]
}

export function getSetPieceRoutine(id: string, restart?: SetPieceRoutine['restart']) {
  return SET_PIECE_ROUTINES.find((item) => item.id === id && (!restart || item.restart === restart))
    ?? SET_PIECE_ROUTINES.find((item) => !restart || item.restart === restart)
    ?? SET_PIECE_ROUTINES[0]
}
