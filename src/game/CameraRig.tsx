import { useRef } from 'react'
import { OrbitControls } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import type { RapierRigidBody } from '@react-three/rapier'
import * as THREE from 'three'
import type { CameraMode } from './types'
import type { KeyboardState } from './useKeyboard'

interface CameraRigProps {
  mode: CameraMode
  ballRef: { current: RapierRigidBody | null }
  controlledPosition: { current: THREE.Vector3 }
  keyboard: { current: KeyboardState }
}

export function CameraRig({ mode, ballRef, controlledPosition, keyboard }: CameraRigProps) {
  const { camera } = useThree()
  const desiredPosition = useRef(new THREE.Vector3())
  const desiredTarget = useRef(new THREE.Vector3())
  const smoothedTarget = useRef(new THREE.Vector3())

  useFrame((_, delta) => {
    const perspective = camera as THREE.PerspectiveCamera
    const ballTranslation = ballRef.current?.translation()
    const ball = ballTranslation ? new THREE.Vector3(ballTranslation.x, ballTranslation.y, ballTranslation.z) : new THREE.Vector3()
    const player = controlledPosition.current

    if (mode === 'free') {
      const held = keyboard.current.held
      const forward = new THREE.Vector3()
      camera.getWorldDirection(forward)
      forward.y = 0
      forward.normalize()
      const right = new THREE.Vector3().crossVectors(forward, camera.up).normalize()
      const movement = new THREE.Vector3()
      if (held.has('w') || held.has('arrowup')) movement.add(forward)
      if (held.has('s') || held.has('arrowdown')) movement.sub(forward)
      if (held.has('d') || held.has('arrowright')) movement.add(right)
      if (held.has('a') || held.has('arrowleft')) movement.sub(right)
      if (held.has('q')) movement.y -= 1
      if (held.has('r')) movement.y += 1
      if (movement.lengthSq() > 0) camera.position.addScaledVector(movement.normalize(), delta * 18)
      perspective.fov = THREE.MathUtils.damp(perspective.fov, 58, 4, delta)
      perspective.updateProjectionMatrix()
      return
    }

    if (mode === 'follow') {
      desiredPosition.current.set(player.x - 9.5, player.y + 4.2, player.z)
      desiredTarget.current.set(player.x + 6, 1.1, player.z)
    } else if (mode === 'ball') {
      desiredPosition.current.set(ball.x - 8.5, Math.max(3.6, ball.y + 3.4), ball.z + 2.6)
      desiredTarget.current.copy(ball).add(new THREE.Vector3(2.5, 0.35, 0))
    } else {
      const travel = THREE.MathUtils.clamp(ball.x, -42, 42)
      desiredPosition.current.set(travel * 0.5, 24 + Math.min(8, ball.y * 1.7), 36)
      desiredTarget.current.set(travel * 0.72, Math.max(0.8, ball.y * 0.35), ball.z * 0.52)
    }

    const cameraDamping = mode === 'broadcast' ? 2.6 : 4.8
    camera.position.lerp(desiredPosition.current, 1 - Math.exp(-cameraDamping * delta))
    smoothedTarget.current.lerp(desiredTarget.current, 1 - Math.exp(-5 * delta))
    camera.lookAt(smoothedTarget.current)
    const targetFov = mode === 'broadcast' ? 44 + Math.min(11, ball.y * 1.6) : mode === 'follow' ? 55 : 48
    perspective.fov = THREE.MathUtils.damp(perspective.fov, targetFov, 4, delta)
    perspective.updateProjectionMatrix()
  })

  return <OrbitControls enabled={mode === 'free'} enableDamping dampingFactor={0.08} minDistance={2} maxDistance={95} maxPolarAngle={Math.PI * 0.48} />
}
