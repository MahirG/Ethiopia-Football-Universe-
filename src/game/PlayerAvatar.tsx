import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { CapsuleCollider, RigidBody, type RapierRigidBody } from '@react-three/rapier'
import * as THREE from 'three'
import { HALF_LENGTH, HALF_WIDTH, PLAYER_HEIGHT } from './config'
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
  onEvent: (message: string) => void
  onAction: (action: MatchAction, team: TeamSide) => void
  onSoundEvent: (event: FootballAudioEvent, context?: Omit<AudioEventContext, 'event'>) => void
}

interface PendingContact {
  action: Extract<HumanAction, 'pass' | 'shoot' | 'clear' | 'tackle'>
  target: THREE.Vector3
  executeAt: number
  technique: FootballTechnique
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
      const catchQuality = profile.ability.goalkeeper * runtime.physical.balance * (1 - runtime.physical.fatigue * 0.2)
      if (catchQuality > 0.72 && ballVelocity.length() < 15) {
        ball.setLinvel({ x: 0, y: 0, z: 0 }, true)
        ball.applyImpulse({ x: -attackDirection(team) * 6.8, y: 1.8, z: -ballPosition.z * 0.16 }, true)
        onSoundEvent('goalkeeper-catch', { team, position: [ballPosition.x, ballPosition.y, ballPosition.z], force: result.soundForce })
      } else {
        ball.applyImpulse({ x: result.impulse.x, y: Math.max(1.2, result.impulse.y), z: result.impulse.z }, true)
        onSoundEvent('goalkeeper-parry', { team, position: [ballPosition.x, ballPosition.y, ballPosition.z], force: result.soundForce })
      }
      onAction('save', team)
      humanWorld.telemetry.goalkeeperReactionMs = Math.round(THREE.MathUtils.lerp(340, 115, profile.ability.reactions * profile.ability.goalkeeper))
    } else {
      ball.applyImpulse({ x: result.impulse.x, y: result.impulse.y, z: result.impulse.z }, true)
      ball.applyTorqueImpulse({ x: result.torque.x, y: result.torque.y, z: result.torque.z }, true)
      const event: FootballAudioEvent = technique === 'header' ? 'header' : action === 'shoot' ? 'shot-taken' : action === 'pass' ? 'pass-completed' : action === 'tackle' || action === 'intercept' ? 'slide-tackle' : result.heavyTouch ? 'heavy-touch' : 'ball-kicked'
      onSoundEvent(event, { team, position: [ballPosition.x, ballPosition.y, ballPosition.z], force: result.soundForce, speed: ballVelocity.length(), wetness: weather === 'rain' ? weatherIntensity : 0 })
      if (action === 'shoot') onAction('shot', team)
      if (action === 'pass') onAction('pass', team)
      if (action === 'tackle' || action === 'intercept') {
        const opponentInfo = nearestOpponent(runtime.id, team, humanWorld)
        if (opponentInfo && opponentInfo.distance < 1.35) {
          const opponentProfile = humanWorld.profiles.get(opponentInfo.player.id)
          const opponentGoalX = team === 'home' ? HALF_LENGTH : -HALF_LENGTH
          const lastDefender = Math.abs(opponentInfo.player.position.x - opponentGoalX) < 18
          const assessment = assessTackle(runtime, profile, opponentInfo.player, ballPosition, result.soundForce, lastDefender)
          opponentInfo.player.physical.balance = Math.max(0.18, opponentInfo.player.physical.balance - result.soundForce * 0.38)
          if (assessment.foul) {
            updateRelationshipAfterEvent(humanWorld.relationships, runtime.id, opponentInfo.player.id, 'foul')
            onSoundEvent('foul-committed', { team, position: [ballPosition.x, ballPosition.y, ballPosition.z], force: assessment.severity, metadata: { reason: assessment.reason } })
            if (assessment.card === 'yellow') onSoundEvent('yellow-card', { team, force: assessment.severity })
            if (assessment.card === 'red') onSoundEvent('red-card', { team, force: assessment.severity })
            onEvent(`${assessment.card === 'none' ? 'Foul' : `${assessment.card.toUpperCase()} card`} · ${assessment.reason.replace('-', ' ')}`)
            runtime.emotion.frustration = Math.min(1, runtime.emotion.frustration + assessment.severity * 0.16)
            const protest = refereeReaction(profile, runtime, true)
            if (protest > 0.42) onSoundEvent('player-call', { team, position: [runtime.position.x, 1.4, runtime.position.z], force: protest, metadata: { intent: 'referee-protest' } })
          }
        }
      }
    }

    runtime.onBall = true
    runtime.action = action
    runtime.actionStartedAt = performance.now() / 1000
    motion.current.kick = action === 'shoot' || action === 'pass' || action === 'clear' ? 1 : motion.current.kick
    motion.current.tackle = action === 'tackle' || action === 'intercept' ? 1 : motion.current.tackle
    humanWorld.telemetry.ballContacts += 1
    if (result.heavyTouch) humanWorld.telemetry.mistakes += 1
    contactCooldown.current = action === 'dribble' ? 0.18 : action === 'goalkeeper-claim' ? 0.9 : 0.42
    return true
  }

  useFrame((state, delta) => {
    const body = bodyRef.current
    const ball = ballRef.current
    if (!body || !ball) return
    const now = state.clock.elapsedTime
    const current = body.translation()
    const translation = ball.translation()
    const linear = ball.linvel()
    ballPosition.set(translation.x, translation.y, translation.z)
    ballVelocity.set(linear.x, linear.y, linear.z)
    runtime.position.set(current.x, current.y, current.z)
    runtime.onBall = false

    contactCooldown.current = Math.max(0, contactCooldown.current - delta)
    dribbleCooldown.current = Math.max(0, dribbleCooldown.current - delta)
    firstTouchCooldown.current = Math.max(0, firstTouchCooldown.current - delta)
    collisionCooldown.current = Math.max(0, collisionCooldown.current - delta)
    stepCooldown.current -= delta
    voiceCooldown.current -= delta
    decisionCooldown.current -= delta
    keeperObservationCooldown.current -= delta

    const perception = perceiveWorld(runtime, humanWorld.world)
    runtime.nearestOpponentDistance = perception.nearestOpponentDistance
    runtime.nearestTeammateDistance = perception.nearestTeammateDistance
    runtime.offsideRisk = perception.offsideRisk
    runtime.emotion.pressure = perception.pressure
    const winning = team === 'home' ? scoreHome > scoreAway : scoreAway > scoreHome
    const losing = team === 'home' ? scoreHome < scoreAway : scoreAway < scoreHome

    if (profile.role === 'goalkeeper' && keeperObservationCooldown.current <= 0) {
      observedBall.copy(ballPosition)
      observedVelocity.copy(ballVelocity)
      keeperObservationCooldown.current = THREE.MathUtils.lerp(0.34, 0.1, profile.ability.reactions * profile.ability.goalkeeper) + runtime.physical.fatigue * 0.1
    }

    desiredVelocity.set(0, 0, 0)
    if (running) {
      if (controlled) {
        const held = keyboard.current.held
        let inputX = Number(held.has('w') || held.has('arrowup')) - Number(held.has('s') || held.has('arrowdown'))
        let inputZ = Number(held.has('d') || held.has('arrowright')) - Number(held.has('a') || held.has('arrowleft'))
        const inputLength = Math.hypot(inputX, inputZ)
        if (inputLength > 0) { inputX /= inputLength; inputZ /= inputLength }
        const sprinting = held.has('shift') && inputLength > 0
        const requestedSpeed = sprinting ? 10 : inputLength > 0 ? 6.5 : 0
        desiredVelocity.set(inputX * requestedSpeed, 0, inputZ * requestedSpeed)
        runtime.hasBallIntent = perception.distanceToBall < 1.7

        if (keyboard.current.pressed.has(' ') && !pendingContact.current) {
          pendingContact.current = { action: 'shoot', target: new THREE.Vector3(attackDirection(team) * HALF_LENGTH, 0.75, THREE.MathUtils.clamp(-ballPosition.z * 0.08, -1.2, 1.2)), executeAt: now + 0.12, technique: held.has('alt') ? 'finesse-shot' : held.has('q') ? 'chip-shot' : held.has('shift') ? 'power-shot' : 'placed-shot' }
          runtime.action = 'shoot'
          runtime.actionStartedAt = now
          motion.current.kick = 0.35
        }
        if (keyboard.current.pressed.has('e') && !pendingContact.current) {
          const teammate = [...perception.teammates].sort((a, b) => {
            const aValue = a.position.clone().sub(runtime.position).dot(new THREE.Vector3(attackDirection(team), 0, 0)) - a.position.distanceTo(runtime.position) * 0.15
            const bValue = b.position.clone().sub(runtime.position).dot(new THREE.Vector3(attackDirection(team), 0, 0)) - b.position.distanceTo(runtime.position) * 0.15
            return bValue - aValue
          })[0]
          pendingContact.current = { action: 'pass', target: teammate?.position.clone().add(teammate.velocity.clone().multiplyScalar(0.42)) ?? runtime.position.clone().add(new THREE.Vector3(attackDirection(team) * 12, 0, 0)), executeAt: now + 0.1, technique: held.has('q') ? 'lofted-pass' : held.has('shift') ? 'driven-pass' : held.has('alt') ? 'through-ball' : 'short-pass' }
          runtime.action = 'pass'
          runtime.actionStartedAt = now
          motion.current.kick = 0.3
        }
        if (keyboard.current.pressed.has('f') && !pendingContact.current) {
          pendingContact.current = { action: 'tackle', target: ballPosition.clone(), executeAt: now + 0.08, technique: held.has('shift') ? 'slide-tackle' : 'poke-tackle' }
          runtime.action = 'tackle'
          runtime.actionStartedAt = now
          motion.current.tackle = 1
        }
        keyboard.current.pressed.delete(' ')
        keyboard.current.pressed.delete('e')
        keyboard.current.pressed.delete('f')

        if (inputLength > 0 && perception.distanceToBall < 1.25 && dribbleCooldown.current === 0 && !pendingContact.current) {
          const dribbleTarget = runtime.position.clone().add(desiredVelocity.clone().normalize().multiplyScalar(sprinting ? 4.4 : 2.1))
          if (performContact('dribble', dribbleTarget, perception.pressure, profile.preferredFoot, sprinting ? 'sprint-dribble' : perception.pressure > 0.55 ? 'protective-touch' : 'close-dribble')) dribbleCooldown.current = THREE.MathUtils.lerp(0.42, 0.26, profile.ability.dribbling) / profile.movement.touchRhythm
        }
      } else {
        if (decisionCooldown.current <= 0) {
          const worldForDecision = profile.role === 'goalkeeper'
            ? { ...humanWorld.world, ballPosition: observedBall, ballVelocity: observedVelocity }
            : humanWorld.world
          const next = chooseDecision(runtime, profile, worldForDecision, anchor, now, humanWorld.relationships)
          if (next.action !== runtime.action) {
            runtime.action = next.action
            runtime.actionStartedAt = now
          }
          decision.current = next
          decisionCooldown.current = THREE.MathUtils.lerp(0.62, 0.18, profile.ability.reactions) * (difficulty === 'Legendary' ? 0.72 : difficulty === 'Academy' ? 1.28 : 1)
        }
        const nextDecision = decision.current
        targetDirection.copy(nextDecision.target).sub(runtime.position).setY(0)
        const targetDistance = targetDirection.length()
        if (targetDistance > 0.18) {
          targetDirection.normalize()
          const roleSpeed = nextDecision.action === 'press' || nextDecision.action === 'goalkeeper-dive' ? 8.6 : nextDecision.action === 'dribble' ? 5.8 : 4.8
          desiredVelocity.copy(targetDirection).multiplyScalar(Math.min(roleSpeed, targetDistance * 1.4))
        }
        if (nextDecision.action === 'goalkeeper-dive') motion.current.goalkeeperDive = 1

        if (['pass', 'shoot', 'clear'].includes(nextDecision.action) && perception.distanceToBall < 1.35 && !pendingContact.current) {
          pendingContact.current = { action: nextDecision.action as PendingContact['action'], target: nextDecision.target.clone(), executeAt: now + THREE.MathUtils.lerp(0.2, 0.08, profile.ability.reactions), technique: defaultTechnique(nextDecision.action, ballPosition.y, runtime.velocity.length() > 6.5) }
          motion.current.kick = 0.35
        } else if (nextDecision.action === 'dribble' && perception.distanceToBall < 1.3 && dribbleCooldown.current === 0) {
          if (performContact('dribble', nextDecision.target, perception.pressure, profile.preferredFoot)) dribbleCooldown.current = THREE.MathUtils.lerp(0.46, 0.25, profile.ability.dribbling) / profile.movement.touchRhythm
        } else if (nextDecision.action === 'tackle' && perception.distanceToBall < 1.45 && contactCooldown.current === 0) {
          performContact('tackle', ballPosition, perception.pressure, profile.preferredFoot)
          motion.current.tackle = 1
        } else if (nextDecision.action === 'goalkeeper-claim' && perception.distanceToBall < 1.85 && contactCooldown.current === 0) {
          performContact('goalkeeper-claim', runtime.position.clone().add(new THREE.Vector3(-attackDirection(team) * 12, 1, 0)), perception.pressure, profile.preferredFoot)
        }
      }
    }

    if (pendingContact.current && now >= pendingContact.current.executeAt) {
      const pending = pendingContact.current
      const right = new THREE.Vector3(-Math.sin(runtime.facing), 0, Math.cos(runtime.facing))
      const side = ballPosition.clone().sub(runtime.position).dot(right) < 0 ? 'left' : 'right'
      const contactSide = side === profile.preferredFoot || profile.ability.weakFoot > 0.72 ? side : profile.preferredFoot
      if (performContact(pending.action, pending.target, perception.pressure, contactSide, pending.technique)) {
        onEvent(pending.action === 'shoot' ? 'Biomechanical strike · planted foot contact' : pending.action === 'pass' ? 'Weighted pass · body orientation applied' : pending.action === 'tackle' ? 'Physical tackle · contact resolved' : 'Clearance under pressure')
      }
      pendingContact.current = null
    }

    const ballDistance = runtime.position.distanceTo(ballPosition)
    if (firstTouchCooldown.current === 0 && previousBallDistance.current > 1.5 && ballDistance < (ballPosition.y > 1.15 ? 1.65 : 1.22) && ballVelocity.length() > 2.2 && !pendingContact.current) {
      if (ballPosition.y > 1.18 && ballPosition.y < profile.body.height + 0.28) {
        const headerTarget = new THREE.Vector3(attackDirection(team) * HALF_LENGTH, 0.8, -ballPosition.z * 0.12)
        if (performContact(profile.role === 'centre-back' ? 'clear' : 'pass', headerTarget, perception.pressure, profile.preferredFoot, 'header')) {
          motion.current.jump = 1
          firstTouchCooldown.current = 0.92
          previousBallDistance.current = ballDistance
          return
        }
      }
      const weatherDifficulty = weather === 'rain' ? weatherIntensity * 0.12 : 0
      const touchQuality = estimateFirstTouchQuality(profile, runtime, ballVelocity.length(), ballPosition.y, perception.pressure, weatherDifficulty)
      const cushion = THREE.MathUtils.lerp(0.22, 0.7, touchQuality)
      const nextVelocity = ballVelocity.clone().multiplyScalar(-cushion * 0.12)
      const forward = new THREE.Vector3(Math.cos(runtime.facing), 0.02, Math.sin(runtime.facing)).multiplyScalar(THREE.MathUtils.lerp(0.35, 1.15, 1 - touchQuality))
      ball.applyImpulse({ x: nextVelocity.x + forward.x, y: nextVelocity.y + forward.y, z: nextVelocity.z + forward.z }, true)
      const heavy = touchQuality < 0.52
      onSoundEvent(heavy ? 'heavy-touch' : ballPosition.y > 1.2 ? 'header' : 'first-touch', { team, position: [ballPosition.x, ballPosition.y, ballPosition.z], force: 1 - touchQuality * 0.55 })
      if (heavy) humanWorld.telemetry.mistakes += 1
      firstTouchCooldown.current = 0.8
    }
    previousBallDistance.current = ballDistance

    const acceleration = previousVelocity.distanceTo(runtime.velocity) / Math.max(delta, 0.001)
    updatePhysicalState(runtime.physical, profile, runtime.velocity.length(), acceleration, delta, weather, weatherIntensity, matchProgress)
    updateEmotion(runtime.emotion, profile, delta, perception.pressure, winning, losing)

    const locomotion = solveLocomotion({
      desiredVelocity,
      currentVelocity: runtime.velocity,
      facing: runtime.facing,
      profile,
      physical: runtime.physical,
      weather,
      weatherIntensity,
      delta,
    })
    previousVelocity.copy(runtime.velocity)
    runtime.velocity.copy(locomotion.velocity)
    runtime.facing = locomotion.facing
    runtime.desiredFacing = desiredVelocity.lengthSq() > 0.01 ? Math.atan2(desiredVelocity.z, desiredVelocity.x) : runtime.facing
    motion.current.gaitRate = locomotion.gaitPhaseRate
    motion.current.strideLength = locomotion.strideLength
    motion.current.lean = locomotion.lean
    motion.current.braking = locomotion.braking
    motion.current.slip = locomotion.slip
    motion.current.plantBias = locomotion.plantBias
    if (locomotion.slip > 0.18) {
      humanWorld.telemetry.footSlipEvents += 1
      runtime.physical.balance = Math.max(0.35, runtime.physical.balance - locomotion.slip * 0.08)
      motion.current.stumble = Math.max(motion.current.stumble, locomotion.slip)
    }

    const opponent = nearestOpponent(runtime.id, team, humanWorld)
    if (opponent && opponent.distance < 0.68 && collisionCooldown.current === 0) {
      const otherProfile = humanWorld.profiles.get(opponent.player.id)
      const separation = runtime.position.clone().sub(opponent.player.position).setY(0)
      if (separation.lengthSq() < 0.001) separation.set(Math.cos(index), 0, Math.sin(index))
      separation.normalize()
      const relativeVelocity = runtime.velocity.clone().sub(opponent.player.velocity)
      const impact = THREE.MathUtils.clamp(relativeVelocity.length() / 9 + (otherProfile?.body.mass ?? 75) / 300, 0, 1)
      const massRatio = (otherProfile?.body.mass ?? 75) / Math.max(55, profile.body.mass)
      runtime.velocity.add(separation.multiplyScalar(impact * -1.1 * massRatio))
      runtime.physical.balance = Math.max(0.2, runtime.physical.balance - impact * (1 - profile.ability.balance * 0.5))
      motion.current.stumble = Math.max(motion.current.stumble, impact)
      opponent.player.physical.balance = Math.max(0.2, opponent.player.physical.balance - impact * 0.36)
      onSoundEvent('player-collision', { team, position: [current.x, current.y, current.z], force: impact })
      const injury = evaluateInjury(runtime.physical, profile, impact, Math.abs(relativeVelocity.z) / 8, contactSequence.current + now)
      if (injury !== 'none') {
        runtime.emotion.pain = Math.max(runtime.emotion.pain, runtime.physical.injurySeverity)
        registerMajorEvent(runtime.emotion, `injury:${injury}`, false, runtime.physical.injurySeverity)
        onSoundEvent('player-pain', { team, position: [current.x, current.y, current.z], force: runtime.physical.injurySeverity })
        onSoundEvent('injury', { team, position: [current.x, current.y, current.z], force: runtime.physical.injurySeverity })
        onEvent(`${injury} concern · player testing the affected area`)
      }
      collisionCooldown.current = 0.55
    }

    const nextX = THREE.MathUtils.clamp(current.x + runtime.velocity.x * delta, -HALF_LENGTH + 0.48, HALF_LENGTH - 0.48)
    const nextZ = THREE.MathUtils.clamp(current.z + runtime.velocity.z * delta, -HALF_WIDTH + 0.48, HALF_WIDTH - 0.48)
    body.setNextKinematicTranslation({ x: nextX, y: profile.body.height / 2, z: nextZ })
    runtime.position.set(nextX, profile.body.height / 2, nextZ)
    runtime.scanTarget.copy(perception.distanceToBall < 8 ? ballPosition : decision.current.target)
    if (controlled) controlledPosition.current.copy(runtime.position)

    const speed = runtime.velocity.length()
    if (running && speed > 1.7 && stepCooldown.current <= 0) {
      onSoundEvent('footstep', { team, position: [nextX, 0, nextZ], force: Math.min(1, speed / 9), wetness: weather === 'rain' ? weatherIntensity : 0, metadata: { controlled, gait: speed > 7 ? 'sprint' : speed > 4 ? 'run' : 'jog' } })
      stepCooldown.current = THREE.MathUtils.lerp(0.45, 0.24, Math.min(1, speed / 9)) / profile.movement.cadenceScale
    }
    if (running && voiceCooldown.current <= 0 && profile.role !== 'goalkeeper' && speed > 0.8 && Math.random() < 0.22 * profile.personality.leadership + perception.pressure * 0.08) {
      onSoundEvent('player-call', { team, position: [nextX, 1.4, nextZ], force: THREE.MathUtils.clamp(0.3 + perception.pressure * 0.5, 0.3, 0.88), metadata: { urgency: perception.pressure, action: runtime.action } })
      voiceCooldown.current = THREE.MathUtils.lerp(14, 6, profile.personality.leadership) + Math.random() * 8
    }

    if (celebrationTeam === team && !celebrationSeen.current) {
      registerMajorEvent(runtime.emotion, 'goal', true, 0.8)
      celebrationSeen.current = true
    } else if (celebrationTeam !== team) celebrationSeen.current = false
  })

  const colliderRadius = THREE.MathUtils.clamp(profile.body.shoulderWidth * 0.47, 0.2, 0.3)
  const colliderHalfHeight = Math.max(0.42, (profile.body.height - colliderRadius * 2) / 2)

  return (
    <RigidBody
      ref={bodyRef}
      type="kinematicPosition"
      colliders={false}
      position={position}
      enabledRotations={[false, false, false]}
      name={`human-player-${runtime.id}`}
    >
      <CapsuleCollider args={[colliderHalfHeight, colliderRadius]} friction={runtime.physical.traction} />
      <HumanPlayerVisual
        profile={profile}
        runtime={runtime}
        motion={motion}
        kitColor={color}
        secondaryColor={secondaryColor}
        quality={quality}
        controlled={controlled}
        presentationPhase={presentationPhase}
        celebrationTeam={celebrationTeam}
      />
    </RigidBody>
  )
}
