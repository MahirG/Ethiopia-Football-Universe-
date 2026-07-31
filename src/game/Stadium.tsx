import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { HALF_LENGTH, HALF_WIDTH } from './config'
import { QUALITY_PRESETS } from './quality'
import type { Difficulty, QualityLevel, TimeOfDay, Weather } from './types'
import type { MatchWorldState } from '../world/types'

interface StadiumProps {
  timeOfDay: TimeOfDay
  weather: Weather
  quality: QualityLevel
  difficulty: Difficulty
  eventPulse: number
  world: MatchWorldState
}

function seeded(index: number) {
  const value = Math.sin(index * 91.371 + 17.17) * 43758.5453
  return value - Math.floor(value)
}

interface CrowdProps {
  side: 'north' | 'south' | 'east' | 'west'
  count: number
  capacityRatio: number
  eventPulse: number
  intensity: number
  homeColor: string
  awayColor: string
  awayShare: number
  choreography: MatchWorldState['crowd']['choreography']
  leavingRatio: number
}

function Crowd({ side, count, capacityRatio, eventPulse, intensity, homeColor, awayColor, awayShare, choreography, leavingRatio }: CrowdProps) {
  const mesh = useRef<THREE.InstancedMesh>(null)
  const group = useRef<THREE.Group>(null)
  const excitement = useRef(0)
  const phase = side === 'north' ? 0 : side === 'south' ? 1.4 : side === 'east' ? 2.7 : 4.1
  const palette = useMemo(() => [homeColor, homeColor, '#f3f0df', '#2c8a5b', '#1d2522', awayColor, '#7f4b9b'], [awayColor, homeColor])
  useEffect(() => { if (eventPulse > 0) excitement.current = 1 }, [eventPulse])
  useLayoutEffect(() => {
    if (!mesh.current) return
    const dummy = new THREE.Object3D()
    const long = side === 'north' || side === 'south'
    const columns = long ? Math.max(34, Math.floor(Math.sqrt(count * 9))) : Math.max(24, Math.floor(Math.sqrt(count * 4.5)))
    const awaySection = side === 'east'
    for (let index = 0; index < count; index += 1) {
      const seatProbability = capacityRatio * (1 - leavingRatio * (seeded(index + 700) > 0.6 ? 1 : 0.25))
      const occupied = seeded(index + phase * 10 + 300) <= seatProbability
      const row = Math.floor(index / columns)
      const column = index % columns
      const jitter = (seeded(index + phase * 10) - 0.5) * 0.34
      if (long) dummy.position.set(-48 + column * (96 / columns) + jitter, 2.05 + row * 0.67, (side === 'north' ? -1 : 1) * (40.4 + row * 0.7))
      else dummy.position.set((side === 'west' ? -1 : 1) * (58.8 + row * 0.7), 2.05 + row * 0.67, -30.5 + column * (61 / columns) + jitter)
      const scale = occupied ? 0.78 + seeded(index + 90) * 0.36 : 0.001
      dummy.scale.set(scale * 0.82, scale, scale * 0.82)
      dummy.rotation.y = seeded(index + 120) * Math.PI * 2
      dummy.updateMatrix()
      mesh.current.setMatrixAt(index, dummy.matrix)
      const isAway = awaySection && seeded(index + 810) < Math.min(0.88, awayShare * 8)
      const choreographyColor = choreography === 'mosaic' && row % 3 === 0 ? '#e7c33c' : choreography === 'championship' && column % 3 === 0 ? '#f0e9d8' : null
      mesh.current.setColorAt(index, new THREE.Color(choreographyColor ?? (isAway ? awayColor : palette[Math.floor(seeded(index + 30) * palette.length)])))
    }
    mesh.current.instanceMatrix.needsUpdate = true
    if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true
  }, [awayColor, awayShare, capacityRatio, choreography, count, homeColor, leavingRatio, palette, phase, side])
  useFrame(({ clock }, delta) => {
    if (!group.current) return
    excitement.current = THREE.MathUtils.damp(excitement.current, 0, 0.72, delta)
    group.current.position.y = Math.sin(clock.elapsedTime * (1.15 + intensity * 0.55) + phase) * 0.04 * intensity + Math.abs(Math.sin(clock.elapsedTime * 9 + phase)) * excitement.current * 0.42
    group.current.rotation.z = Math.sin(clock.elapsedTime * 2.8 + phase) * excitement.current * 0.012
  })
  return <group ref={group}><instancedMesh ref={mesh} args={[undefined, undefined, count]} frustumCulled><capsuleGeometry args={[0.115, 0.3, 3, 6]} /><meshStandardMaterial vertexColors roughness={0.9} /></instancedMesh></group>
}

function Stand({ position, scale, rotation = [0, 0, 0], wet, color }: { position: [number, number, number]; scale: [number, number, number]; rotation?: [number, number, number]; wet: boolean; color: string }) {
  return <group position={position} rotation={rotation}><mesh receiveShadow><boxGeometry args={scale} /><meshPhysicalMaterial color={color} roughness={wet ? 0.42 : 0.82} metalness={wet ? 0.14 : 0.08} clearcoat={wet ? 0.28 : 0} /></mesh><mesh position={[0, scale[1] / 2 + 0.08, 0]}><boxGeometry args={[scale[0] * 0.98, 0.12, scale[2] * 0.98]} /><meshStandardMaterial color="#26322d" roughness={0.6} /></mesh></group>
}

function Floodlight({ position, rotation = [0, 0, 0], quality }: { position: [number, number, number]; rotation?: [number, number, number]; quality: number }) {
  return <group position={position} rotation={rotation}><mesh position={[0, -7, 0]} castShadow><cylinderGeometry args={[0.18, 0.28, 14, 10]} /><meshStandardMaterial color="#4a5550" metalness={0.72} roughness={0.28} /></mesh><mesh castShadow><boxGeometry args={[3.8, 1.6, 0.45]} /><meshStandardMaterial color="#e8eee9" emissive="#dff7ff" emissiveIntensity={2.2 + quality * 2.5} /></mesh><spotLight color="#eaf6ff" intensity={780 + quality * 620} distance={150 + quality * 45} angle={0.72} penumbra={0.58} decay={1.7} castShadow /></group>
}

function useLedTexture(world: MatchWorldState) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 2048
    canvas.height = 128
    const value = new THREE.CanvasTexture(canvas)
    value.colorSpace = THREE.SRGBColorSpace
    value.wrapS = THREE.RepeatWrapping
    value.repeat.set(1.5, 1)
    return value
  }, [])
  useEffect(() => {
    const canvas = texture.image as HTMLCanvasElement
    const context = canvas.getContext('2d')
    if (!context) return
    context.fillStyle = '#06100c'; context.fillRect(0, 0, 2048, 128)
    const gradient = context.createLinearGradient(0, 0, 2048, 0)
    gradient.addColorStop(0, world.competition.colors[0]); gradient.addColorStop(0.4, world.competition.colors[1]); gradient.addColorStop(0.72, world.competition.colors[2]); gradient.addColorStop(1, world.competition.colors[0])
    context.fillStyle = gradient; context.fillRect(0, 0, 2048, 8); context.fillRect(0, 120, 2048, 8)
    context.fillStyle = '#eff7f0'; context.font = '900 52px Arial'; context.textBaseline = 'middle'
    const text = `${world.competition.shortName}   •   ${world.venue.city.toUpperCase()}   •   ${world.competition.visualIdentity}   •   `
    context.fillText(text.repeat(3), 24, 64)
    texture.needsUpdate = true
  }, [texture, world.competition.colors, world.competition.shortName, world.competition.visualIdentity, world.venue.city])
  useEffect(() => () => texture.dispose(), [texture])
  return texture
}

function LedBoards({ world }: { world: MatchWorldState }) {
  const texture = useLedTexture(world)
  useFrame((_, delta) => { texture.offset.x = (texture.offset.x - delta * 0.035) % 1 })
  const opacity = world.venue.archetype === 'rural-field' || world.venue.archetype === 'community-ground' ? 0.2 : 1
  return <group visible={opacity > 0.5}>{([-1, 1] as const).map((side) => <mesh key={`z-${side}`} position={[0, 0.72, side * (HALF_WIDTH + 1.05)]} rotation={[0, side === -1 ? Math.PI : 0, 0]}><boxGeometry args={[102, 1.08, 0.16]} /><meshStandardMaterial color="#fff" map={texture} emissive="#fff" emissiveMap={texture} emissiveIntensity={1.15} toneMapped={false} /></mesh>)}{([-1, 1] as const).map((side) => <mesh key={`x-${side}`} position={[side * (HALF_LENGTH + 1.05), 0.72, 0]} rotation={[0, side === 1 ? -Math.PI / 2 : Math.PI / 2, 0]}><boxGeometry args={[64, 1.08, 0.16]} /><meshStandardMaterial color="#fff" map={texture} emissive="#fff" emissiveMap={texture} emissiveIntensity={1.08} toneMapped={false} /></mesh>)}</group>
}

function Flag({ position, phase, colors, wind }: { position: [number, number, number]; phase: number; colors: [string, string, string]; wind: number }) {
  const group = useRef<THREE.Group>(null)
  useFrame(({ clock }) => { if (group.current) group.current.rotation.z = Math.sin(clock.elapsedTime * (2.2 + wind * 2) + phase) * (0.04 + wind * 0.11) })
  return <group ref={group} position={position}><mesh position={[0, -2, 0]}><cylinderGeometry args={[0.035, 0.05, 4, 8]} /><meshStandardMaterial color="#b9c1bc" metalness={0.7} /></mesh><group position={[1.5, 0, 0]}>{colors.map((color, index) => <mesh key={color} position={[0, 0.5 - index * 0.5, 0]}><planeGeometry args={[3, 0.5, 8, 2]} /><meshStandardMaterial color={color} side={THREE.DoubleSide} /></mesh>)}</group></group>
}

function standLayout(world: MatchWorldState) {
  const venue = world.venue
  if (venue.archetype === 'rural-field' || venue.archetype === 'community-ground') return { long: [62, 3.8, 7] as [number, number, number], short: [7, 3.8, 42] as [number, number, number], distance: 39, sideDistance: 57, color: '#393b32' }
  if (venue.archetype === 'compact-urban' || venue.archetype === 'historic-ground') return { long: [110, 12, 13] as [number, number, number], short: [13, 11, 75] as [number, number, number], distance: 41, sideDistance: 60, color: venue.archetype === 'historic-ground' ? '#393a35' : '#111b18' }
  if (venue.archetype === 'futsal-arena') return { long: [108, 15, 12] as [number, number, number], short: [12, 15, 72] as [number, number, number], distance: 39, sideDistance: 59, color: '#111720' }
  return { long: [112, 10.8 + venue.tiers * 1.6, 15] as [number, number, number], short: [15, 10.2 + venue.tiers * 1.5, 78] as [number, number, number], distance: 44, sideDistance: 62, color: '#141b18' }
}

export function Stadium({ timeOfDay, weather, quality, difficulty, eventPulse, world }: StadiumProps) {
  const preset = QUALITY_PRESETS[quality]
  const wet = ['rain', 'storm', 'snow'].includes(weather)
  const intensity = Math.min(1, (difficulty === 'Legendary' ? 0.9 : difficulty === 'Professional' ? 0.72 : 0.52) + world.telemetry.crowdEnergy * 0.28)
  const layout = standLayout(world)
  const crowdScale = Math.max(0.08, world.attendance.capacityRatio)
  const longCount = Math.max(80, Math.round(preset.crowdPerLongStand * Math.min(1, 0.42 + world.venue.capacity / 60000)))
  const shortCount = Math.max(45, Math.round(preset.crowdPerShortStand * Math.min(1, 0.42 + world.venue.capacity / 60000)))
  const wind = world.weather === 'wind' || world.weather === 'storm' ? world.weatherIntensity * world.venue.openness : 0.18
  const showFloodlights = ['night', 'late-night', 'evening'].includes(timeOfDay) || world.venue.roof === 'indoor'
  return <group>
    <Stand position={[0, layout.long[1] / 2, -layout.distance]} scale={layout.long} rotation={[-0.1, 0, 0]} wet={wet} color={layout.color} />
    <Stand position={[0, layout.long[1] / 2, layout.distance]} scale={layout.long} rotation={[0.1, 0, 0]} wet={wet} color={layout.color} />
    <Stand position={[-layout.sideDistance, layout.short[1] / 2, 0]} scale={layout.short} rotation={[0, 0, -0.08]} wet={wet} color={layout.color} />
    <Stand position={[layout.sideDistance, layout.short[1] / 2, 0]} scale={layout.short} rotation={[0, 0, 0.08]} wet={wet} color={layout.color} />
    <Crowd side="north" count={longCount} capacityRatio={crowdScale} eventPulse={eventPulse} intensity={intensity} homeColor={world.competition.colors[0]} awayColor={world.competition.colors[2]} awayShare={world.venue.awayAllocation} choreography={world.crowd.choreography} leavingRatio={world.crowd.leavingRatio} />
    <Crowd side="south" count={longCount} capacityRatio={crowdScale} eventPulse={eventPulse} intensity={intensity} homeColor={world.competition.colors[0]} awayColor={world.competition.colors[2]} awayShare={world.venue.awayAllocation} choreography={world.crowd.choreography} leavingRatio={world.crowd.leavingRatio} />
    <Crowd side="east" count={shortCount} capacityRatio={crowdScale} eventPulse={eventPulse} intensity={intensity} homeColor={world.competition.colors[0]} awayColor={world.competition.colors[2]} awayShare={world.venue.awayAllocation} choreography={world.crowd.choreography} leavingRatio={world.crowd.leavingRatio} />
    <Crowd side="west" count={shortCount} capacityRatio={crowdScale} eventPulse={eventPulse} intensity={intensity} homeColor={world.competition.colors[0]} awayColor={world.competition.colors[2]} awayShare={world.venue.awayAllocation} choreography={world.crowd.choreography} leavingRatio={world.crowd.leavingRatio} />
    <LedBoards world={world} />
    {showFloodlights && <><Floodlight position={[-54, 23, -35]} rotation={[0.44, 0.8, 0]} quality={world.venue.floodlightQuality} /><Floodlight position={[54, 23, -35]} rotation={[0.44, -0.8, 0]} quality={world.venue.floodlightQuality} /><Floodlight position={[-54, 23, 35]} rotation={[-0.44, 2.35, 0]} quality={world.venue.floodlightQuality} /><Floodlight position={[54, 23, 35]} rotation={[-0.44, -2.35, 0]} quality={world.venue.floodlightQuality} /></>}
    <mesh position={[0, 3.2, HALF_WIDTH + 4.3]}><boxGeometry args={[12, 3.8, 3.5]} /><meshPhysicalMaterial color="#183328" roughness={0.55} transparent opacity={0.86} /></mesh>
    <mesh position={[0, 1.5, -HALF_WIDTH - 4.4]}><boxGeometry args={[7, 3, 5]} /><meshStandardMaterial color="#07110d" roughness={0.86} /></mesh>
    <Flag position={[-35, 16, -48]} phase={0} colors={world.competition.colors} wind={wind} /><Flag position={[35, 16, 48]} phase={1.7} colors={['#16844d', '#e6c63b', '#c93f3c']} wind={wind} />
    {([-1, 1] as const).flatMap((x) => ([-1, 1] as const).map((z) => <mesh key={`${x}-${z}`} position={[x * 57, 16, z * 43]}><boxGeometry args={[0.22, 30, 0.22]} /><meshStandardMaterial color="#63706a" metalness={0.72} /></mesh>))}
  </group>
}
