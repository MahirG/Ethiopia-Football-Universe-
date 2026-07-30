import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { HALF_LENGTH, HALF_WIDTH } from './config'
import type { TimeOfDay } from './types'

function seeded(index: number) {
  const value = Math.sin(index * 91.371 + 17.17) * 43758.5453
  return value - Math.floor(value)
}

function CrowdBlock({ side }: { side: 'north' | 'south' | 'east' | 'west' }) {
  const count = side === 'north' || side === 'south' ? 640 : 360
  const ref = useRef<THREE.InstancedMesh>(null)
  const palette = useMemo(() => ['#e5c94d', '#df463f', '#f3f0df', '#2c8a5b', '#4d7eb8', '#1d2522'], [])

  useLayoutEffect(() => {
    if (!ref.current) return
    const dummy = new THREE.Object3D()
    for (let index = 0; index < count; index += 1) {
      const row = Math.floor(index / (side === 'north' || side === 'south' ? 80 : 45))
      const column = index % (side === 'north' || side === 'south' ? 80 : 45)
      const jitter = (seeded(index) - 0.5) * 0.34
      if (side === 'north' || side === 'south') {
        dummy.position.set(-47 + column * 1.2 + jitter, 2.1 + row * 0.72, (side === 'north' ? -1 : 1) * (41 + row * 0.74))
      } else {
        dummy.position.set((side === 'west' ? -1 : 1) * (59 + row * 0.74), 2.1 + row * 0.72, -30 + column * 1.35 + jitter)
      }
      const pulse = 0.78 + seeded(index + 90) * 0.38
      dummy.scale.setScalar(pulse)
      dummy.rotation.y = seeded(index + 120) * Math.PI * 2
      dummy.updateMatrix()
      ref.current.setMatrixAt(index, dummy.matrix)
      ref.current.setColorAt(index, new THREE.Color(palette[Math.floor(seeded(index + 30) * palette.length)]))
    }
    ref.current.instanceMatrix.needsUpdate = true
    if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true
  }, [count, palette, side])

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]} castShadow={false} receiveShadow={false}>
      <capsuleGeometry args={[0.12, 0.28, 3, 6]} />
      <meshStandardMaterial vertexColors roughness={0.9} />
    </instancedMesh>
  )
}

function Stand({ position, scale, rotation = [0, 0, 0] }: { position: [number, number, number]; scale: [number, number, number]; rotation?: [number, number, number] }) {
  return (
    <group position={position} rotation={rotation}>
      <mesh receiveShadow>
        <boxGeometry args={scale} />
        <meshStandardMaterial color="#141b18" roughness={0.82} metalness={0.08} />
      </mesh>
      <mesh position={[0, scale[1] / 2 + 0.08, 0]}>
        <boxGeometry args={[scale[0] * 0.98, 0.12, scale[2] * 0.98]} />
        <meshStandardMaterial color="#26322d" roughness={0.65} />
      </mesh>
    </group>
  )
}

function Floodlight({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, -7, 0]} castShadow>
        <cylinderGeometry args={[0.18, 0.28, 14, 10]} />
        <meshStandardMaterial color="#4a5550" metalness={0.72} roughness={0.28} />
      </mesh>
      <mesh castShadow>
        <boxGeometry args={[3.8, 1.6, 0.45]} />
        <meshStandardMaterial color="#e8eee9" emissive="#dff7ff" emissiveIntensity={3.2} />
      </mesh>
      <spotLight color="#eaf6ff" intensity={950} distance={170} angle={0.72} penumbra={0.58} decay={1.7} castShadow />
    </group>
  )
}

export function Stadium({ timeOfDay }: { timeOfDay: TimeOfDay }) {
  const night = timeOfDay === 'night'
  return (
    <group>
      <Stand position={[0, 3.1, -(HALF_WIDTH + 11)]} scale={[118, 6, 15]} rotation={[-0.08, 0, 0]} />
      <Stand position={[0, 3.1, HALF_WIDTH + 11]} scale={[118, 6, 15]} rotation={[0.08, 0, 0]} />
      <Stand position={[-(HALF_LENGTH + 12), 3.1, 0]} scale={[16, 6, 73]} rotation={[0, 0, 0.08]} />
      <Stand position={[HALF_LENGTH + 12, 3.1, 0]} scale={[16, 6, 73]} rotation={[0, 0, -0.08]} />

      <CrowdBlock side="north" />
      <CrowdBlock side="south" />
      <CrowdBlock side="east" />
      <CrowdBlock side="west" />

      {([-1, 1] as const).map((zSide) => (
        <mesh key={`led-${zSide}`} position={[0, 0.72, zSide * (HALF_WIDTH + 1.05)]}>
          <boxGeometry args={[102, 1.08, 0.16]} />
          <meshStandardMaterial color="#0d1914" emissive={zSide === 1 ? '#1cb86c' : '#e4bd35'} emissiveIntensity={1.2} />
        </mesh>
      ))}
      {([-1, 1] as const).map((xSide) => (
        <mesh key={`goal-led-${xSide}`} position={[xSide * (HALF_LENGTH + 1.05), 0.72, 0]}>
          <boxGeometry args={[0.16, 1.08, 64]} />
          <meshStandardMaterial color="#0d1914" emissive={xSide === 1 ? '#d43939' : '#1b8dc8'} emissiveIntensity={1.1} />
        </mesh>
      ))}

      {night && (
        <>
          <Floodlight position={[-58, 18, -42]} />
          <Floodlight position={[58, 18, -42]} />
          <Floodlight position={[-58, 18, 42]} />
          <Floodlight position={[58, 18, 42]} />
        </>
      )}

      <mesh position={[0, 10, 0]}>
        <cylinderGeometry args={[79, 79, 1.2, 64, 1, true]} />
        <meshStandardMaterial color="#0a0f0d" side={THREE.BackSide} transparent opacity={0.45} roughness={0.95} />
      </mesh>
    </group>
  )
}
