import { forwardRef, useImperativeHandle, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { BallCollider, RigidBody, type RapierRigidBody } from '@react-three/rapier'
import * as THREE from 'three'
import './game.css'
import { BALL_RADIUS } from './config'
import type { QualityLevel, Weather } from './types'

interface BallProps {
  weather: Weather
  quality: QualityLevel
}

const PANEL_DIRECTIONS = [
  new THREE.Vector3(0, 1, 0),
  new THREE.Vector3(0.76, 0.38, 0.52),
  new THREE.Vector3(-0.76, 0.38, 0.52),
  new THREE.Vector3(0.76, 0.38, -0.52),
  new THREE.Vector3(-0.76, 0.38, -0.52),
  new THREE.Vector3(0, -0.82, 0.57),
  new THREE.Vector3(0, -0.82, -0.57),
].map((value) => value.normalize())

function BallPanel({ direction }: { direction: THREE.Vector3 }) {
  const quaternion = useMemo(() => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), direction), [direction])
  return (
    <mesh position={direction.clone().multiplyScalar(BALL_RADIUS * 1.005)} quaternion={quaternion}>
      <circleGeometry args={[BALL_RADIUS * 0.22, 5]} />
      <meshPhysicalMaterial color="#171a19" roughness={0.66} clearcoat={0.08} polygonOffset polygonOffsetFactor={-2} />
    </mesh>
  )
}

export const Football = forwardRef<RapierRigidBody, BallProps>(function Football({ weather, quality }, forwardedRef) {
  const bodyRef = useRef<RapierRigidBody>(null)
  const meshRef = useRef<THREE.Group>(null)
  const trailRefs = useRef<Array<THREE.Mesh | null>>([])
  const trailPositions = useRef(Array.from({ length: 6 }, () => new THREE.Vector3(0, -20, 0)))
  const linearVector = useMemo(() => new THREE.Vector3(), [])
  const angularVector = useMemo(() => new THREE.Vector3(), [])
  const magnusVector = useMemo(() => new THREE.Vector3(), [])
  const dragVector = useMemo(() => new THREE.Vector3(), [])

  useImperativeHandle(forwardedRef, () => bodyRef.current as RapierRigidBody, [])

  useFrame((_, delta) => {
    const body = bodyRef.current
    if (!body) return
    const translation = body.translation()
    const linear = body.linvel()
    const angular = body.angvel()
    linearVector.set(linear.x, linear.y, linear.z)
    angularVector.set(angular.x, angular.y, angular.z)
    const speed = linearVector.length()

    if (speed > 1.5) {
      magnusVector.crossVectors(angularVector, linearVector).multiplyScalar(0.00016 * delta)
      dragVector.copy(linearVector).multiplyScalar(-0.00052 * speed * delta)
      body.applyImpulse({ x: magnusVector.x + dragVector.x, y: magnusVector.y + dragVector.y, z: magnusVector.z + dragVector.z }, true)
    }

    if (meshRef.current) {
      const groundCompression = translation.y < BALL_RADIUS + 0.035 ? THREE.MathUtils.clamp((speed - 4) / 80, 0, 0.11) : 0
      meshRef.current.scale.set(1 + groundCompression * 0.48, 1 - groundCompression, 1 + groundCompression * 0.48)
    }

    if (quality !== 'performance') {
      for (let index = trailPositions.current.length - 1; index > 0; index -= 1) {
        trailPositions.current[index].copy(trailPositions.current[index - 1])
      }
      trailPositions.current[0].set(translation.x, translation.y, translation.z)
      for (let index = 0; index < trailRefs.current.length; index += 1) {
        const trail = trailRefs.current[index]
        if (!trail) continue
        trail.position.copy(trailPositions.current[index] ?? trailPositions.current[0])
        trail.visible = speed > 17
        const trailScale = 0.78 - index * 0.09
        trail.scale.setScalar(Math.max(0.18, trailScale))
        const material = trail.material as THREE.MeshBasicMaterial
        material.opacity = speed > 17 ? Math.max(0, 0.13 - index * 0.019) : 0
      }
    }
  })

  return (
    <>
      <RigidBody
        ref={bodyRef}
        colliders={false}
        position={[0, BALL_RADIUS + 0.07, 0]}
        restitution={weather === 'rain' ? 0.52 : 0.44}
        friction={weather === 'rain' ? 0.2 : 0.54}
        linearDamping={weather === 'rain' ? 0.12 : 0.28}
        angularDamping={weather === 'rain' ? 0.16 : 0.23}
        canSleep={false}
        ccd
        name="match-ball"
      >
        <BallCollider args={[BALL_RADIUS]} density={77} />
        <group ref={meshRef}>
          <mesh castShadow receiveShadow>
            <icosahedronGeometry args={[BALL_RADIUS, quality === 'performance' ? 3 : 5]} />
            <meshPhysicalMaterial color="#f6f3ea" roughness={weather === 'rain' ? 0.34 : 0.54} clearcoat={weather === 'rain' ? 0.48 : 0.22} clearcoatRoughness={0.42} sheen={0.08} />
          </mesh>
          {PANEL_DIRECTIONS.map((direction, index) => <BallPanel key={index} direction={direction} />)}
          <mesh scale={1.006}>
            <icosahedronGeometry args={[BALL_RADIUS, 2]} />
            <meshBasicMaterial color="#1d211f" wireframe transparent opacity={0.18} />
          </mesh>
        </group>
      </RigidBody>

      {quality !== 'performance' && Array.from({ length: 6 }, (_, index) => (
        <mesh key={index} ref={(value) => { trailRefs.current[index] = value }} visible={false} renderOrder={-1}>
          <sphereGeometry args={[BALL_RADIUS * 0.72, 10, 10]} />
          <meshBasicMaterial color="#eef7f1" transparent opacity={0} depthWrite={false} />
        </mesh>
      ))}
    </>
  )
})
