import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { RapierRigidBody } from '@react-three/rapier'
import * as THREE from 'three'
import { QUALITY_PRESETS } from './quality'
import type { QualityLevel, Weather } from './types'

interface SurfaceEffectsProps {
  ballRef: { current: RapierRigidBody | null }
  controlledPosition: { current: THREE.Vector3 }
  quality: QualityLevel
  weather: Weather
}

const PARTICLE_COUNT = 72

function randomDirection(index: number) {
  const angle = index * 2.399963 + Math.random() * 0.3
  const radius = 0.5 + Math.random() * 1.2
  return new THREE.Vector3(Math.cos(angle) * radius, 1.1 + Math.random() * 1.8, Math.sin(angle) * radius)
}

export function SurfaceEffects({ ballRef, controlledPosition, quality, weather }: SurfaceEffectsProps) {
  const markCount = QUALITY_PRESETS[quality].surfaceMarks
  const marksRef = useRef<THREE.InstancedMesh>(null)
  const markCursor = useRef(0)
  const markCooldown = useRef(0)
  const playerDistance = useRef(0)
  const lastPlayer = useRef(controlledPosition.current.clone())
  const lastBallVelocity = useRef(new THREE.Vector3())
  const currentBallVelocity = useMemo(() => new THREE.Vector3(), [])
  const burstOrigin = useMemo(() => new THREE.Vector3(), [])
  const particleGeometry = useRef<THREE.BufferGeometry>(null)
  const particlePositions = useMemo(() => new Float32Array(PARTICLE_COUNT * 3).fill(-20), [])
  const particleVelocities = useRef(Array.from({ length: PARTICLE_COUNT }, () => new THREE.Vector3()))
  const particleLives = useRef(new Float32Array(PARTICLE_COUNT))
  const particleCursor = useRef(0)
  const dummy = useMemo(() => new THREE.Object3D(), [])

  useLayoutEffect(() => {
    if (!marksRef.current) return
    dummy.scale.setScalar(0)
    dummy.updateMatrix()
    for (let index = 0; index < markCount; index += 1) marksRef.current.setMatrixAt(index, dummy.matrix)
    marksRef.current.instanceMatrix.needsUpdate = true
  }, [dummy, markCount])

  const spawnMark = (x: number, z: number, scale: number, rotation: number) => {
    if (!marksRef.current || markCount === 0) return
    const index = markCursor.current % markCount
    dummy.position.set(x, 0.035, z)
    dummy.rotation.set(-Math.PI / 2, 0, rotation)
    dummy.scale.set(scale * 1.8, scale, 1)
    dummy.updateMatrix()
    marksRef.current.setMatrixAt(index, dummy.matrix)
    marksRef.current.instanceMatrix.needsUpdate = true
    markCursor.current += 1
  }

  const burst = (origin: THREE.Vector3, speed: number) => {
    if (quality === 'performance') return
    const amount = Math.min(20, 7 + Math.floor(speed * 0.45))
    for (let offset = 0; offset < amount; offset += 1) {
      const index = particleCursor.current % PARTICLE_COUNT
      const positionIndex = index * 3
      particlePositions[positionIndex] = origin.x + (Math.random() - 0.5) * 0.18
      particlePositions[positionIndex + 1] = 0.08
      particlePositions[positionIndex + 2] = origin.z + (Math.random() - 0.5) * 0.18
      particleVelocities.current[index].copy(randomDirection(index)).multiplyScalar(0.5 + Math.min(1.2, speed / 18))
      particleLives.current[index] = 0.45 + Math.random() * 0.45
      particleCursor.current += 1
    }
  }

  useFrame((_, delta) => {
    markCooldown.current = Math.max(0, markCooldown.current - delta)
    const player = controlledPosition.current
    const playerStep = player.distanceTo(lastPlayer.current)
    playerDistance.current += playerStep
    if (playerDistance.current > (weather === 'rain' ? 0.75 : 1.25)) {
      spawnMark(player.x, player.z, weather === 'rain' ? 0.27 : 0.18, Math.atan2(player.z - lastPlayer.current.z, player.x - lastPlayer.current.x))
      playerDistance.current = 0
    }
    lastPlayer.current.copy(player)

    const body = ballRef.current
    if (body) {
      const translation = body.translation()
      const linear = body.linvel()
      const speed = Math.hypot(linear.x, linear.y, linear.z)
      currentBallVelocity.set(linear.x, linear.y, linear.z)
      const velocityChange = lastBallVelocity.current.distanceTo(currentBallVelocity)
      if (translation.y < 0.24 && speed > 3.2 && markCooldown.current === 0) {
        spawnMark(translation.x, translation.z, THREE.MathUtils.clamp(speed / 34, 0.1, weather === 'rain' ? 0.42 : 0.3), Math.atan2(linear.z, linear.x))
        if (velocityChange > 2.8 || Math.abs(linear.y) > 2) {
          burstOrigin.set(translation.x, 0, translation.z)
          burst(burstOrigin, speed)
        }
        markCooldown.current = weather === 'rain' ? 0.08 : 0.14
      }
      lastBallVelocity.current.set(linear.x, linear.y, linear.z)
    }

    let particlesChanged = false
    for (let index = 0; index < PARTICLE_COUNT; index += 1) {
      if (particleLives.current[index] <= 0) continue
      particleLives.current[index] -= delta
      const positionIndex = index * 3
      const velocity = particleVelocities.current[index]
      velocity.y -= 5.8 * delta
      particlePositions[positionIndex] += velocity.x * delta
      particlePositions[positionIndex + 1] = Math.max(0.015, particlePositions[positionIndex + 1] + velocity.y * delta)
      particlePositions[positionIndex + 2] += velocity.z * delta
      if (particlePositions[positionIndex + 1] <= 0.016) velocity.multiplyScalar(0.55)
      if (particleLives.current[index] <= 0) particlePositions[positionIndex + 1] = -20
      particlesChanged = true
    }
    if (particlesChanged && particleGeometry.current) {
      const attribute = particleGeometry.current.getAttribute('position') as THREE.BufferAttribute
      attribute.needsUpdate = true
    }
  })

  return (
    <group>
      <instancedMesh ref={marksRef} args={[undefined, undefined, markCount]} receiveShadow={false}>
        <circleGeometry args={[1, 16]} />
        <meshBasicMaterial color={weather === 'rain' ? '#10261c' : '#173e29'} transparent opacity={weather === 'rain' ? 0.34 : 0.24} depthWrite={false} polygonOffset polygonOffsetFactor={-2} />
      </instancedMesh>
      <points frustumCulled={false}>
        <bufferGeometry ref={particleGeometry}>
          <bufferAttribute attach="attributes-position" args={[particlePositions, 3]} />
        </bufferGeometry>
        <pointsMaterial color={weather === 'rain' ? '#7f9a88' : '#3e7e4f'} size={0.055} transparent opacity={0.72} depthWrite={false} />
      </points>
    </group>
  )
}
