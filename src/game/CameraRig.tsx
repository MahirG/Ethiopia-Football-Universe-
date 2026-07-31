import { useEffect, useRef } from 'react'
import { OrbitControls } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import type { RapierRigidBody } from '@react-three/rapier'
import * as THREE from 'three'
import type { CameraMode, PresentationPhase, QualityLevel } from './types'
import type { KeyboardState } from './useKeyboard'

interface CameraRigProps {
  mode: CameraMode
  replayToken: number
  replayActive: boolean
  quality: QualityLevel
  presentationPhase: PresentationPhase
  matchProgress: number
  cameraShake: boolean
  ballRef: { current: RapierRigidBody | null }
  controlledPosition: { current: THREE.Vector3 }
  keyboard: { current: KeyboardState }
}

interface ReplayFrame {
  ball: THREE.Vector3
  player: THREE.Vector3
  velocity: THREE.Vector3
}

const MAX_REPLAY_FRAMES = 300
const REPLAY_DURATION = 4.4

export function CameraRig({ mode, replayToken, replayActive, quality, presentationPhase, matchProgress, cameraShake, ballRef, controlledPosition, keyboard }: CameraRigProps) {
  const { camera } = useThree()
  const desiredPosition = useRef(new THREE.Vector3())
  const desiredTarget = useRef(new THREE.Vector3())
  const smoothedTarget = useRef(new THREE.Vector3())
  const ballPosition = useRef(new THREE.Vector3())
  const ballVelocity = useRef(new THREE.Vector3())
  const predictedBall = useRef(new THREE.Vector3())
  const forward = useRef(new THREE.Vector3())
  const right = useRef(new THREE.Vector3())
  const movement = useRef(new THREE.Vector3())
  const velocityDirection = useRef(new THREE.Vector3())
  const targetOffset = useRef(new THREE.Vector3())
  const replayBuffer = useRef<ReplayFrame[]>([])
  const replayFrames = useRef<ReplayFrame[]>([])
  const replayStartedAt = useRef(0)
  const replayStartPending = useRef(false)
  const phaseStartedAt = useRef(0)
  const phaseStartPending = useRef(true)
  const shake = useRef(0)
  const lastBallSpeed = useRef(0)

  useEffect(() => { phaseStartPending.current = true }, [presentationPhase])
  useEffect(() => {
    if (replayToken === 0) return
    replayFrames.current = replayBuffer.current.map((frame) => ({ ball: frame.ball.clone(), player: frame.player.clone(), velocity: frame.velocity.clone() }))
    replayStartPending.current = true
    if (cameraShake) shake.current = 0.34
  }, [cameraShake, replayToken])

  useFrame((state, delta) => {
    const perspective = camera as THREE.PerspectiveCamera
    const translation = ballRef.current?.translation()
    const velocity = ballRef.current?.linvel()
    if (translation) ballPosition.current.set(translation.x, translation.y, translation.z)
    else ballPosition.current.set(0, 0.11, 0)
    if (velocity) ballVelocity.current.set(velocity.x, velocity.y, velocity.z)
    else ballVelocity.current.set(0, 0, 0)
    if (phaseStartPending.current) { phaseStartedAt.current = state.clock.elapsedTime; phaseStartPending.current = false }

    const ballSpeed = ballVelocity.current.length()
    if (!replayActive && mode !== 'free' && presentationPhase === 'live') {
      replayBuffer.current.push({ ball: ballPosition.current.clone(), player: controlledPosition.current.clone(), velocity: ballVelocity.current.clone() })
      if (replayBuffer.current.length > MAX_REPLAY_FRAMES) replayBuffer.current.shift()
    }
    if (cameraShake && ballSpeed - lastBallSpeed.current > 8.5) shake.current = Math.min(0.22, shake.current + 0.12)
    lastBallSpeed.current = ballSpeed
    shake.current = THREE.MathUtils.damp(shake.current, 0, 4.6, delta)

    const phaseElapsed = Math.max(0, state.clock.elapsedTime - phaseStartedAt.current)
    if (!replayActive && presentationPhase === 'intro') {
      const sequence = THREE.MathUtils.clamp(phaseElapsed / 5.8, 0, 1)
      if (sequence < 0.34) {
        const arc = sequence / 0.34
        desiredPosition.current.set(-48 + arc * 20, 31 - arc * 7, 44 - arc * 16)
        desiredTarget.current.set(-8 + arc * 8, 0.6, 0)
        perspective.fov = THREE.MathUtils.damp(perspective.fov, 50, 4, delta)
      } else if (sequence < 0.7) {
        const dolly = (sequence - 0.34) / 0.36
        desiredPosition.current.set(-18 + dolly * 38, 5.1, 32.5)
        desiredTarget.current.set(-10 + dolly * 22, 1.05, 0)
        perspective.fov = THREE.MathUtils.damp(perspective.fov, 39, 5, delta)
      } else {
        const close = (sequence - 0.7) / 0.3
        desiredPosition.current.set(controlledPosition.current.x - 5.6 + close * 1.4, 2.4, controlledPosition.current.z + 2.5)
        desiredTarget.current.copy(controlledPosition.current).add(targetOffset.current.set(1.8, 0.3, 0))
        perspective.fov = THREE.MathUtils.damp(perspective.fov, 34, 5.4, delta)
      }
      camera.position.lerp(desiredPosition.current, 1 - Math.exp(-4.8 * delta))
      smoothedTarget.current.lerp(desiredTarget.current, 1 - Math.exp(-6.2 * delta))
      camera.lookAt(smoothedTarget.current)
      perspective.updateProjectionMatrix()
      return
    }

    if (!replayActive && presentationPhase === 'halftime') {
      const orbit = phaseElapsed * 0.24
      desiredPosition.current.set(Math.cos(orbit) * 39, 29, Math.sin(orbit) * 39)
      desiredTarget.current.set(0, 0.5, 0)
      camera.position.lerp(desiredPosition.current, 1 - Math.exp(-2.2 * delta))
      smoothedTarget.current.lerp(desiredTarget.current, 1 - Math.exp(-3.2 * delta))
      camera.lookAt(smoothedTarget.current)
      perspective.fov = THREE.MathUtils.damp(perspective.fov, 48, 3.5, delta)
      perspective.updateProjectionMatrix()
      return
    }

    if (!replayActive && presentationPhase === 'fulltime') {
      const orbit = phaseElapsed * 0.34
      const radius = 15 + Math.sin(phaseElapsed * 0.3) * 2.5
      desiredPosition.current.set(Math.cos(orbit) * radius, 6.5 + Math.sin(phaseElapsed * 0.55) * 1.2, Math.sin(orbit) * radius)
      desiredTarget.current.set(0, 1.05, 0)
      camera.position.lerp(desiredPosition.current, 1 - Math.exp(-3.4 * delta))
      smoothedTarget.current.lerp(desiredTarget.current, 1 - Math.exp(-4.4 * delta))
      camera.lookAt(smoothedTarget.current)
      perspective.fov = THREE.MathUtils.damp(perspective.fov, 42, 4.2, delta)
      perspective.updateProjectionMatrix()
      return
    }

    if (mode === 'free' && !replayActive) {
      const held = keyboard.current.held
      camera.getWorldDirection(forward.current)
      forward.current.y = 0
      forward.current.normalize()
      right.current.crossVectors(forward.current, camera.up).normalize()
      movement.current.set(0, 0, 0)
      if (held.has('w') || held.has('arrowup')) movement.current.add(forward.current)
      if (held.has('s') || held.has('arrowdown')) movement.current.sub(forward.current)
      if (held.has('d') || held.has('arrowright')) movement.current.add(right.current)
      if (held.has('a') || held.has('arrowleft')) movement.current.sub(right.current)
      if (held.has('q')) movement.current.y -= 1
      if (held.has('r')) movement.current.y += 1
      if (movement.current.lengthSq() > 0) camera.position.addScaledVector(movement.current.normalize(), delta * 18)
      camera.position.x = THREE.MathUtils.clamp(camera.position.x, -62, 62)
      camera.position.y = THREE.MathUtils.clamp(camera.position.y, 2.2, 44)
      camera.position.z = THREE.MathUtils.clamp(camera.position.z, -45, 45)
      perspective.fov = THREE.MathUtils.damp(perspective.fov, 58, 4, delta)
      perspective.updateProjectionMatrix()
      return
    }

    if (replayActive && replayFrames.current.length > 0) {
      if (replayStartPending.current) { replayStartedAt.current = state.clock.elapsedTime; replayStartPending.current = false }
      const elapsed = Math.max(0, state.clock.elapsedTime - replayStartedAt.current)
      const normalized = THREE.MathUtils.clamp(elapsed / REPLAY_DURATION, 0, 0.999)
      const frame = replayFrames.current[Math.min(replayFrames.current.length - 1, Math.floor(normalized * replayFrames.current.length))]
      const orbit = normalized * Math.PI * 1.45
      if (normalized < 0.34) {
        desiredPosition.current.set(frame.ball.x - 7.5, Math.max(1.65, frame.ball.y + 1.55), frame.ball.z + 4.8)
        desiredTarget.current.copy(frame.ball).addScaledVector(frame.velocity, 0.055)
      } else if (normalized < 0.7) {
        desiredPosition.current.set(frame.ball.x - 2.5, 8.5 + normalized * 8, frame.ball.z + 13)
        desiredTarget.current.lerpVectors(frame.player, frame.ball, 0.68)
      } else {
        desiredPosition.current.set(frame.ball.x + Math.cos(orbit) * 8.5, 3.1 + Math.sin(normalized * Math.PI) * 2.3, frame.ball.z + Math.sin(orbit) * 8.5)
        desiredTarget.current.copy(frame.ball).add(targetOffset.current.set(0, 0.45, 0))
      }
      camera.position.lerp(desiredPosition.current, 1 - Math.exp(-7.2 * delta))
      smoothedTarget.current.lerp(desiredTarget.current, 1 - Math.exp(-8.5 * delta))
      camera.lookAt(smoothedTarget.current)
      perspective.fov = THREE.MathUtils.damp(perspective.fov, normalized < 0.34 ? 39 : 45, 5.4, delta)
      perspective.updateProjectionMatrix()
      return
    }

    const player = controlledPosition.current
    predictedBall.current.copy(ballPosition.current).addScaledVector(ballVelocity.current, THREE.MathUtils.clamp(ballSpeed / 65, 0.08, 0.34))
    let activeMode: CameraMode = mode
    if (mode === 'auto') {
      const playerDistance = player.distanceTo(ballPosition.current)
      activeMode = ballPosition.current.y > 3.2 || ballSpeed > 17 ? 'ball' : playerDistance < 7.5 ? 'follow' : 'broadcast'
    }
    if (activeMode === 'follow') {
      const attackDirection = ballPosition.current.x >= player.x ? 1 : -1
      desiredPosition.current.set(player.x - attackDirection * 8.8, player.y + 4.1, player.z + 1.8)
      desiredTarget.current.set(player.x + attackDirection * 6.8, 1.05, player.z)
    } else if (activeMode === 'ball') {
      if (ballVelocity.current.lengthSq() > 0.1) velocityDirection.current.copy(ballVelocity.current).normalize()
      else velocityDirection.current.set(1, 0, 0)
      desiredPosition.current.copy(ballPosition.current).addScaledVector(velocityDirection.current, -8.2)
      desiredPosition.current.y = Math.max(3.4, ballPosition.current.y + 3.3)
      desiredPosition.current.z += 2.4
      desiredTarget.current.copy(predictedBall.current).add(targetOffset.current.set(1.4, 0.3, 0))
    } else {
      const travel = THREE.MathUtils.clamp(predictedBall.current.x, -43, 43)
      const sideline = predictedBall.current.z >= 0 ? 1 : -1
      desiredPosition.current.set(travel * 0.48, 23.5 + Math.min(9, ballPosition.current.y * 1.85), sideline * 36.5)
      desiredTarget.current.set(travel * 0.74, Math.max(0.75, ballPosition.current.y * 0.35), predictedBall.current.z * 0.56)
    }
    desiredPosition.current.x = THREE.MathUtils.clamp(desiredPosition.current.x, -61, 61)
    desiredPosition.current.y = THREE.MathUtils.clamp(desiredPosition.current.y, 2.2, 42)
    desiredPosition.current.z = THREE.MathUtils.clamp(desiredPosition.current.z, -43, 43)
    camera.position.lerp(desiredPosition.current, 1 - Math.exp(-(activeMode === 'broadcast' ? 2.75 : 5.25) * delta))
    if (cameraShake && shake.current > 0.001 && quality !== 'performance') {
      camera.position.x += (Math.random() - 0.5) * shake.current
      camera.position.y += (Math.random() - 0.5) * shake.current * 0.55
      camera.position.z += (Math.random() - 0.5) * shake.current
    }
    smoothedTarget.current.lerp(desiredTarget.current, 1 - Math.exp(-5.4 * delta))
    camera.lookAt(smoothedTarget.current)
    const lateMatchTension = matchProgress > 0.82 ? 2.5 : 0
    const targetFov = activeMode === 'broadcast' ? 43 + Math.min(12, ballPosition.current.y * 1.65) + Math.min(4, ballSpeed * 0.09) - lateMatchTension : activeMode === 'follow' ? 53 + Math.min(6, ballSpeed * 0.12) : 47 + Math.min(8, ballPosition.current.y)
    perspective.fov = THREE.MathUtils.damp(perspective.fov, targetFov, 4.2, delta)
    perspective.updateProjectionMatrix()
  })

  return <OrbitControls enabled={mode === 'free' && !replayActive && presentationPhase === 'live'} enableDamping dampingFactor={0.075} minDistance={2} maxDistance={95} maxPolarAngle={Math.PI * 0.48} minPolarAngle={0.08} enablePan />
}
