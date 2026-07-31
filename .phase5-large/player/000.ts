import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { CapsuleCollider, RigidBody, type RapierRigidBody } from '@react-three/rapier'
import * as THREE from 'three'
import { HALF_LENGTH, HALF_WIDTH } from './config'
import type { Difficulty, MatchAction, PresentationPhase, QualityLevel, TeamSide, Weather } from './types'
import type { KeyboardState } from './useKeyboard'
import type { AudioEventContext, FootballAudioEvent } from '../audio/types'
import { HumanPlayerVisual } from '../human/HumanPlayerVisual'
import { calculateBallContact, estimateFirstTouchQuality } from '../human/ballContact'
import { solveLocomotion } from '../human/biomechanics'
import { chooseDecision, perceiveWorld } from '../human/decisionAI'
import { evaluateInjury, registerMajorEvent, updateEmotion, updatePhysicalState } from '../human/state'
import { assessTackle, refereeReaction } from '../human/officiating'
import { updateRelationshipAfterEvent } from '../human/relationships'
import { findRuntime, type HumanWorldBundle } from '../human/world'
import type { DecisionResult, FootballTechnique, HumanAction, PreferredFoot, VisualMotionState } from '../human/types'
import { defaultTechnique } from '../human/techniques'
import { getTacticalPreset } from '../phase5/catalog'
import { tacticalAnchor } from '../phase5/tactics'
import type { CompetitiveMatchState, CompetitiveSettings, Phase5BallContact, Phase5FoulContact } from '../phase5/types'

interface PlayerAvatarProps {
  index: number
  team: TeamSide
  position: [number, number, number]
  color: string
  secondaryColor: string
  controlled?: boolean
  running: boolean
  difficulty: Difficulty
  quality: QualityLevel
  keyboard: { current: KeyboardState }
  ballRef: { current: RapierRigidBody | null }
  controlledPosition: { current: THREE.Vector3 }
  matchProgress: number
  presentationPhase: PresentationPhase
  celebrationTeam: TeamSide | null
  weather: Weather
  weatherIntensity: number
  scoreHome: number
  scoreAway: number
  humanWorld: HumanWorldBundle
  competitiveState: CompetitiveMatchState
  competitiveSettings: CompetitiveSettings
  onBallContact: (contact: Phase5BallContact) => void
  onFoul: (contact: Phase5FoulContact) => void
  onEvent: (message: string) => void
  onAction: (action: MatchAction, team: TeamSide) => void
  onSoundEvent: (event: FootballAudioEvent, context?: Omit<AudioEventContext, 'event'>) => void
}

interface PendingContact {
  action: Extract<HumanAction, 'pass' | 'shoot' | 'clear' | 'tackle'>
  target: THREE.Vector3
  executeAt: number
  technique: FootballTechnique
  receiverId?: string
}

function attackDirection(team: TeamSide) {
  return team === 'home' ? 1 : -1
}

function nearestOpponent(runtimeId: string, team: TeamSide, world: HumanWorldBundle) {
  const runtime = world.world.players.find((player) => player.id === runtimeId)
  if (!runtime) return null
  let nearest = null as (typeof world.world.players)[number] | null
  let distance = Number.POSITIVE_INFINITY
  for (const player of world.world.players) {
    if (player.team === team || player.id === runtimeId) continue
    const nextDistance = Math.hypot(player.position.x - runtime.position.x, player.position.z - runtime.position.z)
    if (nextDistance < distance) { distance = nextDistance; nearest = player }
  }
  return nearest ? { player: nearest, distance } : null
}

export function PlayerAvatar({
  index,
  team,
  position,
  color,
  secondaryColor,
  controlled = false,
  running,
  difficulty,
  quality,
  keyboard,
  ballRef,
  controlledPosition,
  matchProgress,
  presentationPhase,
  celebrationTeam,
  weather,
  weatherIntensity,
  scoreHome,
  scoreAway,
  humanWorld,
  competitiveState,
  competitiveSettings,
  onBallContact,
  onFoul,
  onEvent,
  onAction,
  onSoundEvent,
}: PlayerAvatarProps) {
  const bodyRef = useRef<RapierRigidBody>(null)
  const profile = humanWorld.profiles.get(`${team}-${index}`)
  const runtime = findRuntime(humanWorld, team, index)
  if (!profile || !runtime) throw new Error(`Missing human simulation profile for ${team}-${index}`)

  const anchor = useMemo(() => new THREE.Vector3(...position), [position])
  const desiredVelocity = useMemo(() => new THREE.Vector3(), [])
  const targetDirection = useMemo(() => new THREE.Vector3(), [])
  const previousVelocity = useMemo(() => new THREE.Vector3(), [])
  const ballPosition = useMemo(() => new THREE.Vector3(), [])
  const ballVelocity = useMemo(() => new THREE.Vector3(), [])
  const observedBall = useMemo(() => new THREE.Vector3(), [])
  const observedVelocity = useMemo(() => new THREE.Vector3(), [])
  const decision = useRef<DecisionResult>({ action: profile.role === 'goalkeeper' ? 'goalkeeper-set' : 'hold', target: anchor.clone(), utility: 0 })
  const decisionCooldown = useRef(0.1 + index * 0.013)
  const contactCooldown = useRef(0)
  const dribbleCooldown = useRef(0.2)
  const firstTouchCooldown = useRef(0)
  const collisionCooldown = useRef(0)
  const stepCooldown = useRef(0.18 + index * 0.014)
  const voiceCooldown = useRef(5 + index * 0.53)
  const keeperObservationCooldown = useRef(0)
  const pendingContact = useRef<PendingContact | null>(null)
  const contactSequence = useRef(index * 101 + (team === 'away' ? 4000 : 0))
  const previousBallDistance = useRef(99)
  const celebrationSeen = useRef(false)
  const motion = useRef<VisualMotionState>({
    gaitPhase: index * 0.42,
    gaitRate: 0,
    strideLength: 0.8,
    lean: 0,
    braking: 0,
    slip: 0,
    plantBias: 0.55,
    kick: 0,
    tackle: 0,
    stumble: 0,
    goalkeeperDive: 0,
    jump: 0,
  })

  const performContact = (
    action: Extract<HumanAction, 'dribble' | 'pass' | 'shoot' | 'clear' | 'tackle' | 'intercept' | 'goalkeeper-claim'>,
    target: THREE.Vector3,
    pressure: number,
    contactSide: PreferredFoot,
    technique: FootballTechnique = defaultTechnique(action, ballPosition.y, runtime.velocity.length() > 6.5),
    receiverId?: string,
  ) => {
    const ball = ballRef.current
    if (!ball || contactCooldown.current > 0) return false
    const translation = ball.translation()
    const velocity = ball.linvel()
    ballPosition.set(translation.x, translation.y, translation.z)
    ballVelocity.set(velocity.x, velocity.y, velocity.z)
    contactSequence.current += 1
    const result = calculateBallContact({
      action,
      player: profile,
      runtime,
      ballPosition,
      ballVelocity,
      target,
      pressure,
      weather,
      weatherIntensity,
      matchProgress,
      contactSide,
      seed: contactSequence.current + Math.floor(matchProgress * 1000),
      technique,
    })
    const reach = action === 'goalkeeper-claim' ? 1.65 : action === 'tackle' || action === 'intercept' ? 1.15 : 0.94
    if (result.contactPoint.distanceTo(ballPosition) > reach && runtime.position.distanceTo(ballPosition) > reach + 0.35) return false

    if (action === 'goalkeeper-claim') {
