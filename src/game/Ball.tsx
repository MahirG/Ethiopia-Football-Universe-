import { forwardRef, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { BallCollider, RigidBody, type RapierRigidBody } from '@react-three/rapier'
import * as THREE from 'three'
import './game.css'
import { BALL_RADIUS } from './config'
import type { Weather } from './types'

interface BallProps {
  weather: Weather
}

export const Football = forwardRef<RapierRigidBody, BallProps>(function Football({ weather }, forwardedRef) {
  const meshRef = useRef<THREE.Mesh>(null)

  useFrame((_, delta) => {
    if (!meshRef.current) return
    meshRef.current.rotation.x += delta * 0.8
    meshRef.current.rotation.z += delta * 0.55
  })

  return (
    <RigidBody
      ref={forwardedRef}
      colliders={false}
      position={[0, BALL_RADIUS + 0.07, 0]}
      restitution={weather === 'rain' ? 0.54 : 0.44}
      friction={weather === 'rain' ? 0.24 : 0.52}
      linearDamping={weather === 'rain' ? 0.2 : 0.42}
      angularDamping={0.24}
      canSleep={false}
      ccd
      name="match-ball"
    >
      <BallCollider args={[BALL_RADIUS]} density={77} />
      <mesh ref={meshRef} castShadow receiveShadow>
        <icosahedronGeometry args={[BALL_RADIUS, 4]} />
        <meshPhysicalMaterial color="#f4f1e8" roughness={0.56} clearcoat={0.25} clearcoatRoughness={0.5} />
      </mesh>
      <mesh scale={1.004}>
        <icosahedronGeometry args={[BALL_RADIUS, 1]} />
        <meshBasicMaterial color="#151a18" wireframe transparent opacity={0.48} />
      </mesh>
    </RigidBody>
  )
})
