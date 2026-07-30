import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { HALF_LENGTH, HALF_WIDTH } from './config'
import { QUALITY_PRESETS } from './quality'
import type { Difficulty, QualityLevel, TimeOfDay, Weather } from './types'

interface StadiumProps {
  timeOfDay: TimeOfDay
  weather: Weather
  quality: QualityLevel
  difficulty: Difficulty
  eventPulse: number
}

function seeded(index: number) {
  const value = Math.sin(index * 91.371 + 17.17) * 43758.5453
  return value - Math.floor(value)
}

function Crowd({ side, count, eventPulse, intensity }: { side: 'north' | 'south' | 'east' | 'west'; count: number; eventPulse: number; intensity: number }) {
  const mesh = useRef<THREE.InstancedMesh>(null)
  const group = useRef<THREE.Group>(null)
  const excitement = useRef(0)
  const phase = side === 'north' ? 0 : side === 'south' ? 1.4 : side === 'east' ? 2.7 : 4.1
  const palette = useMemo(() => ['#e5c94d', '#df463f', '#f3f0df', '#2c8a5b', '#4d7eb8', '#1d2522', '#7f4b9b'], [])
  useEffect(() => { if (eventPulse > 0) excitement.current = 1 }, [eventPulse])
  useLayoutEffect(() => {
    if (!mesh.current) return
    const dummy = new THREE.Object3D()
    const long = side === 'north' || side === 'south'
    const columns = long ? Math.max(34, Math.floor(Math.sqrt(count * 9))) : Math.max(24, Math.floor(Math.sqrt(count * 4.5)))
    for (let index = 0; index < count; index += 1) {
      const row = Math.floor(index / columns)
      const column = index % columns
      const jitter = (seeded(index + phase * 10) - 0.5) * 0.34
      if (long) dummy.position.set(-48 + column * (96 / columns) + jitter, 2.05 + row * 0.67, (side === 'north' ? -1 : 1) * (40.4 + row * 0.7))
      else dummy.position.set((side === 'west' ? -1 : 1) * (58.8 + row * 0.7), 2.05 + row * 0.67, -30.5 + column * (61 / columns) + jitter)
      const scale = 0.78 + seeded(index + 90) * 0.36
      dummy.scale.set(scale * 0.82, scale, scale * 0.82)
      dummy.rotation.y = seeded(index + 120) * Math.PI * 2
      dummy.updateMatrix()
      mesh.current.setMatrixAt(index, dummy.matrix)
      mesh.current.setColorAt(index, new THREE.Color(palette[Math.floor(seeded(index + 30) * palette.length)]))
    }
    mesh.current.instanceMatrix.needsUpdate = true
    if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true
  }, [count, palette, phase, side])
  useFrame(({ clock }, delta) => {
    if (!group.current) return
    excitement.current = THREE.MathUtils.damp(excitement.current, 0, 0.72, delta)
    group.current.position.y = Math.sin(clock.elapsedTime * (1.15 + intensity * 0.55) + phase) * 0.04 * intensity + Math.abs(Math.sin(clock.elapsedTime * 9 + phase)) * excitement.current * 0.42
    group.current.rotation.z = Math.sin(clock.elapsedTime * 2.8 + phase) * excitement.current * 0.012
  })
  return <group ref={group}><instancedMesh ref={mesh} args={[undefined, undefined, count]} frustumCulled><capsuleGeometry args={[0.115, 0.3, 3, 6]} /><meshStandardMaterial vertexColors roughness={0.9} /></instancedMesh></group>
}

function Stand({ position, scale, rotation = [0, 0, 0], wet }: { position: [number, number, number]; scale: [number, number, number]; rotation?: [number, number, number]; wet: boolean }) {
  return <group position={position} rotation={rotation}><mesh receiveShadow><boxGeometry args={scale} /><meshPhysicalMaterial color="#141b18" roughness={wet ? 0.42 : 0.82} metalness={wet ? 0.14 : 0.08} clearcoat={wet ? 0.28 : 0} /></mesh><mesh position={[0, scale[1] / 2 + 0.08, 0]}><boxGeometry args={[scale[0] * 0.98, 0.12, scale[2] * 0.98]} /><meshStandardMaterial color="#26322d" roughness={0.6} /></mesh></group>
}

function Floodlight({ position, rotation = [0, 0, 0] }: { position: [number, number, number]; rotation?: [number, number, number] }) {
  return <group position={position} rotation={rotation}><mesh position={[0, -7, 0]} castShadow><cylinderGeometry args={[0.18, 0.28, 14, 10]} /><meshStandardMaterial color="#4a5550" metalness={0.72} roughness={0.28} /></mesh><mesh castShadow><boxGeometry args={[3.8, 1.6, 0.45]} /><meshStandardMaterial color="#e8eee9" emissive="#dff7ff" emissiveIntensity={3.8} /></mesh><spotLight color="#eaf6ff" intensity={1120} distance={176} angle={0.72} penumbra={0.58} decay={1.7} castShadow /></group>
}

function useLedTexture() {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 2048
    canvas.height = 128
    const context = canvas.getContext('2d')
    if (context) {
      context.fillStyle = '#06100c'; context.fillRect(0, 0, 2048, 128)
      const gradient = context.createLinearGradient(0, 0, 2048, 0)
      gradient.addColorStop(0, '#0c9a5b'); gradient.addColorStop(0.33, '#e0bd3f'); gradient.addColorStop(0.66, '#cb3e3e'); gradient.addColorStop(1, '#0c9a5b')
      context.fillStyle = gradient; context.fillRect(0, 0, 2048, 8); context.fillRect(0, 120, 2048, 8)
      context.fillStyle = '#eff7f0'; context.font = '900 56px Arial'; context.textBaseline = 'middle'
      context.fillText('ETHIOPIA FOOTBALL UNIVERSE   •   PLAY WITH PRIDE   •   ONE NATION, MANY CLUBS   •   '.repeat(2), 24, 64)
    }
    const value = new THREE.CanvasTexture(canvas)
    value.colorSpace = THREE.SRGBColorSpace
    value.wrapS = THREE.RepeatWrapping
    value.repeat.set(1.5, 1)
    return value
  }, [])
  useEffect(() => () => texture.dispose(), [texture])
  return texture
}

function LedBoards() {
  const texture = useLedTexture()
  useFrame((_, delta) => { texture.offset.x = (texture.offset.x - delta * 0.035) % 1 })
  return <>{([-1, 1] as const).map((side) => <mesh key={`z-${side}`} position={[0, 0.72, side * (HALF_WIDTH + 1.05)]} rotation={[0, side === -1 ? Math.PI : 0, 0]}><boxGeometry args={[102, 1.08, 0.16]} /><meshStandardMaterial color="#fff" map={texture} emissive="#fff" emissiveMap={texture} emissiveIntensity={1.15} toneMapped={false} /></mesh>)}{([-1, 1] as const).map((side) => <mesh key={`x-${side}`} position={[side * (HALF_LENGTH + 1.05), 0.72, 0]} rotation={[0, side === 1 ? -Math.PI / 2 : Math.PI / 2, 0]}><boxGeometry args={[64, 1.08, 0.16]} /><meshStandardMaterial color="#fff" map={texture} emissive="#fff" emissiveMap={texture} emissiveIntensity={1.08} toneMapped={false} /></mesh>)}</>
}

function Flag({ position, phase }: { position: [number, number, number]; phase: number }) {
  const group = useRef<THREE.Group>(null)
  useFrame(({ clock }) => { if (group.current) group.current.rotation.z = Math.sin(clock.elapsedTime * 2.8 + phase) * 0.08 })
  return <group ref={group} position={position}><mesh position={[0, -2, 0]}><cylinderGeometry args={[0.035, 0.05, 4, 8]} /><meshStandardMaterial color="#b9c1bc" metalness={0.7} /></mesh><group position={[1.5, 0, 0]}><mesh position={[0, 0.5, 0]}><planeGeometry args={[3, 0.66, 8, 2]} /><meshStandardMaterial color="#16844d" side={THREE.DoubleSide} /></mesh><mesh><planeGeometry args={[3, 0.66, 8, 2]} /><meshStandardMaterial color="#e6c63b" side={THREE.DoubleSide} /></mesh><mesh position={[0, -0.5, 0]}><planeGeometry args={[3, 0.66, 8, 2]} /><meshStandardMaterial color="#c93f3c" side={THREE.DoubleSide} /></mesh></group></group>
}

export function Stadium({ timeOfDay, weather, quality, difficulty, eventPulse }: StadiumProps) {
  const preset = QUALITY_PRESETS[quality]
  const wet = weather === 'rain'
  const intensity = difficulty === 'Legendary' ? 1 : difficulty === 'Professional' ? 0.78 : 0.58
  return <group>
    <Stand position={[0, 5.4, -44]} scale={[112, 10.8, 15]} rotation={[-0.1, 0, 0]} wet={wet} />
    <Stand position={[0, 5.4, 44]} scale={[112, 10.8, 15]} rotation={[0.1, 0, 0]} wet={wet} />
    <Stand position={[-62, 5.1, 0]} scale={[15, 10.2, 78]} rotation={[0, 0, -0.08]} wet={wet} />
    <Stand position={[62, 5.1, 0]} scale={[15, 10.2, 78]} rotation={[0, 0, 0.08]} wet={wet} />
    <Crowd side="north" count={preset.crowdPerLongStand} eventPulse={eventPulse} intensity={intensity} />
    <Crowd side="south" count={preset.crowdPerLongStand} eventPulse={eventPulse} intensity={intensity} />
    <Crowd side="east" count={preset.crowdPerShortStand} eventPulse={eventPulse} intensity={intensity} />
    <Crowd side="west" count={preset.crowdPerShortStand} eventPulse={eventPulse} intensity={intensity} />
    <LedBoards />
    {timeOfDay === 'night' && <><Floodlight position={[-54, 23, -35]} rotation={[0.44, 0.8, 0]} /><Floodlight position={[54, 23, -35]} rotation={[0.44, -0.8, 0]} /><Floodlight position={[-54, 23, 35]} rotation={[-0.44, 2.35, 0]} /><Floodlight position={[54, 23, 35]} rotation={[-0.44, -2.35, 0]} /></>}
    <mesh position={[0, 3.2, HALF_WIDTH + 4.3]}><boxGeometry args={[12, 3.8, 3.5]} /><meshPhysicalMaterial color="#183328" roughness={0.55} transparent opacity={0.86} /></mesh>
    <mesh position={[0, 1.5, -HALF_WIDTH - 4.4]}><boxGeometry args={[7, 3, 5]} /><meshStandardMaterial color="#07110d" roughness={0.86} /></mesh>
    <Flag position={[-35, 16, -48]} phase={0} /><Flag position={[35, 16, 48]} phase={1.7} />
    {([-1, 1] as const).flatMap((x) => ([-1, 1] as const).map((z) => <mesh key={`${x}-${z}`} position={[x * 57, 16, z * 43]}><boxGeometry args={[0.22, 30, 0.22]} /><meshStandardMaterial color="#63706a" metalness={0.72} /></mesh>))}
  </group>
}
