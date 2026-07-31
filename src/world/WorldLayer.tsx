import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { Text } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { HALF_LENGTH, HALF_WIDTH } from '../game/config'
import type { MatchWorldState } from './types'

interface WorldLayerProps {
  world: MatchWorldState
  homeName: string
  awayName: string
  homeColor: string
  awayColor: string
  eventPulse: number
}

function seeded(index: number) {
  const value = Math.sin(index * 73.911 + 11.137) * 43758.5453
  return value - Math.floor(value)
}

function Architecture({ world }: { world: MatchWorldState }) {
  const { venue } = world
  const roofColor = venue.archetype === 'historic-ground' ? '#60584d' : venue.archetype === 'community-ground' || venue.archetype === 'rural-field' ? '#473f32' : '#25312e'
  const roofDepth = venue.roofCoverage * 13
  const roofHeight = venue.archetype === 'national-bowl' ? 21 : venue.archetype === 'modern-arena' ? 18 : 13
  const openVenue = venue.roof === 'open' || venue.archetype === 'rural-field' || venue.archetype === 'street-court'
  const longStandLength = venue.archetype === 'community-ground' || venue.archetype === 'rural-field' ? 60 : 114
  return (
    <group>
      {!openVenue && roofDepth > 1 && (
        <>
          <mesh position={[0, roofHeight, -(HALF_WIDTH + 13)]} rotation={[0.08, 0, 0]} castShadow receiveShadow>
            <boxGeometry args={[longStandLength, 0.55, roofDepth]} />
            <meshPhysicalMaterial color={roofColor} metalness={0.38} roughness={0.48} clearcoat={0.12} />
          </mesh>
          <mesh position={[0, roofHeight, HALF_WIDTH + 13]} rotation={[-0.08, 0, 0]} castShadow receiveShadow>
            <boxGeometry args={[longStandLength, 0.55, roofDepth]} />
            <meshPhysicalMaterial color={roofColor} metalness={0.38} roughness={0.48} clearcoat={0.12} />
          </mesh>
        </>
      )}
      {venue.tiers > 1 && (
        <>
          <mesh position={[0, 13.8, -(HALF_WIDTH + 16.8)]}><boxGeometry args={[110, 5.8, 9]} /><meshStandardMaterial color="#111917" roughness={0.78} /></mesh>
          <mesh position={[0, 13.8, HALF_WIDTH + 16.8]}><boxGeometry args={[110, 5.8, 9]} /><meshStandardMaterial color="#111917" roughness={0.78} /></mesh>
        </>
      )}
      {venue.hasTrack && <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}><ringGeometry args={[43, 48, 96]} /><meshStandardMaterial color="#854b40" roughness={0.92} /></mesh>}
      {venue.archetype === 'street-court' && (
        <>
          {[-1, 1].map((side) => <mesh key={side} position={[0, 3.5, side * (HALF_WIDTH + 2.1)]}><planeGeometry args={[PITCH_SAFE_LENGTH, 7, 28, 4]} /><meshStandardMaterial color="#2b3532" wireframe transparent opacity={0.65} /></mesh>)}
          <group position={[0, 0, HALF_WIDTH + 14]}>
            {Array.from({ length: 7 }, (_, index) => <mesh key={index} position={[(index - 3) * 13, 7 + (index % 2) * 3, 0]}><boxGeometry args={[10, 14 + (index % 3) * 5, 8]} /><meshStandardMaterial color={index % 2 ? '#6f665e' : '#82766a'} roughness={0.95} /></mesh>)}
          </group>
        </>
      )}
      {venue.archetype === 'rural-field' && (
        <>
          <mesh position={[0, -0.4, HALF_WIDTH + 22]} rotation={[-0.04, 0, 0]}><coneGeometry args={[36, 10, 6]} /><meshStandardMaterial color="#324b34" roughness={1} /></mesh>
          <mesh position={[-36, 1.5, -HALF_WIDTH - 12]}><cylinderGeometry args={[1.2, 1.6, 3, 8]} /><meshStandardMaterial color="#594334" /></mesh>
        </>
      )}
      {venue.archetype === 'futsal-arena' && (
        <mesh position={[0, 22, 0]}><boxGeometry args={[125, 1.2, 88]} /><meshStandardMaterial color="#141b22" metalness={0.4} roughness={0.48} /></mesh>
      )}
    </group>
  )
}

const PITCH_SAFE_LENGTH = HALF_LENGTH * 2 + 8

function useScoreTexture(world: MatchWorldState, homeName: string, awayName: string) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 1024
    canvas.height = 512
    const value = new THREE.CanvasTexture(canvas)
    value.colorSpace = THREE.SRGBColorSpace
    return value
  }, [])
  useEffect(() => {
    const canvas = texture.image as HTMLCanvasElement
    const context = canvas.getContext('2d')
    if (!context) return
    context.fillStyle = world.competition.colors[0]
    context.fillRect(0, 0, canvas.width, canvas.height)
    const gradient = context.createLinearGradient(0, 0, canvas.width, 0)
    gradient.addColorStop(0, world.competition.colors[0])
    gradient.addColorStop(0.5, '#07100d')
    gradient.addColorStop(1, world.competition.colors[1])
    context.fillStyle = gradient
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.fillStyle = '#f7f4e8'
    context.textAlign = 'center'
    context.font = '700 34px Arial'
    context.fillText(world.competition.shortName, 512, 62)
    context.font = '900 64px Arial'
    context.fillText(`${homeName}  ${world.scoreHome} — ${world.scoreAway}  ${awayName}`, 512, 178)
    context.font = '700 42px Arial'
    context.fillText(`${String(Math.floor(world.matchMinute)).padStart(2, '0')}:00`, 512, 250)
    context.font = '600 27px Arial'
    context.fillText(world.ceremony.active ? world.ceremony.stage.toUpperCase() : world.phase.replace('-', ' ').toUpperCase(), 512, 318)
    context.font = '500 22px Arial'
    context.fillText(`${world.venue.name} · ${world.attendance.total.toLocaleString()} spectators`, 512, 384)
    context.fillStyle = world.competition.colors[2]
    context.fillRect(120, 430, 784, 10)
    texture.needsUpdate = true
  }, [awayName, homeName, texture, world])
  useEffect(() => () => texture.dispose(), [texture])
  return texture
}

function StadiumScreens({ world, homeName, awayName }: { world: MatchWorldState; homeName: string; awayName: string }) {
  const texture = useScoreTexture(world, homeName, awayName)
  const count = Math.max(1, world.venue.screenCount)
  return (
    <group>
      {Array.from({ length: count }, (_, index) => {
        const side = index % 2 === 0 ? -1 : 1
        return <mesh key={index} position={[side * (world.venue.hasTrack ? 45 : 36), 16 + index * 0.5, side * -2]} rotation={[0, side === -1 ? Math.PI / 2 : -Math.PI / 2, 0]}>
          <boxGeometry args={[10.5, 5.8, 0.45]} />
          <meshStandardMaterial map={texture} emissive="#ffffff" emissiveMap={texture} emissiveIntensity={0.88} toneMapped={false} />
        </mesh>
      })}
    </group>
  )
}

function StaffFigure({ position, color, activity, phase }: { position: [number, number, number]; color: string; activity: number; phase: number }) {
  const group = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (!group.current) return
    group.current.position.y = Math.abs(Math.sin(clock.elapsedTime * (1.4 + activity) + phase)) * 0.035 * activity
    group.current.rotation.y = Math.sin(clock.elapsedTime * 0.6 + phase) * 0.14 * activity
  })
  return <group ref={group} position={position}>
    <mesh position={[0, 0.85, 0]}><capsuleGeometry args={[0.14, 0.72, 3, 6]} /><meshStandardMaterial color={color} roughness={0.82} /></mesh>
    <mesh position={[0, 1.43, 0]}><sphereGeometry args={[0.16, 10, 8]} /><meshStandardMaterial color="#8a5b43" roughness={0.82} /></mesh>
  </group>
}

function MatchDayStaff({ world }: { world: MatchWorldState }) {
  const qualityLimit = world.quality === 'performance' ? 18 : world.quality === 'balanced' ? 34 : 56
  const figures = useMemo(() => {
    const values: Array<{ position: [number, number, number]; color: string; phase: number }> = []
    const categories = [
      { count: Math.min(world.staff.stewards, 16), color: '#e9c737', line: HALF_WIDTH + 2.8 },
      { count: Math.min(world.staff.cameraOperators, 10), color: '#1b242b', line: HALF_WIDTH + 4.2 },
      { count: Math.min(world.staff.photographers, 10), color: '#30465d', line: -(HALF_WIDTH + 3.5) },
      { count: Math.min(world.staff.ballAssistants, 8), color: '#de6d32', line: -(HALF_WIDTH + 2.2) },
      { count: Math.min(world.staff.paramedics, 6), color: '#f1f1e8', line: HALF_WIDTH + 6 },
    ]
    let cursor = 0
    for (const category of categories) {
      for (let index = 0; index < category.count && values.length < qualityLimit; index += 1) {
        values.push({ position: [-45 + ((cursor * 9.7) % 90), 0, category.line + (seeded(cursor) - 0.5) * 0.7], color: category.color, phase: seeded(cursor + 80) * 6 })
        cursor += 1
      }
    }
    return values
  }, [qualityLimit, world.staff])
  return <group>{figures.map((figure, index) => <StaffFigure key={index} {...figure} activity={world.staff.activity} />)}</group>
}

function Bench({ side, world, color }: { side: -1 | 1; world: MatchWorldState; color: string }) {
  const reaction = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (!reaction.current) return
    const goalPulse = world.crowd.homeEnergy > 0.8 || world.crowd.awayEnergy > 0.8 ? 1 : 0
    reaction.current.position.y = Math.abs(Math.sin(clock.elapsedTime * 7)) * goalPulse * 0.2
  })
  return <group position={[side * 18, 0, HALF_WIDTH + 2.8]}>
    <mesh position={[0, 1.05, 0]}><boxGeometry args={[9, 2.2, 2.2]} /><meshPhysicalMaterial color="#16211f" transparent opacity={0.72} roughness={0.32} clearcoat={0.42} /></mesh>
    <mesh position={[0, 2.15, -0.7]} rotation={[-0.18, 0, 0]}><boxGeometry args={[9.4, 0.12, 2.5]} /><meshStandardMaterial color="#586660" metalness={0.46} /></mesh>
    <group ref={reaction}>
      {Array.from({ length: 8 }, (_, index) => <StaffFigure key={index} position={[-3.6 + index * 1.03, 0.08, 0.1]} color={index < 5 ? '#e8a62f' : color} activity={0.45 + world.staff.activity * 0.4} phase={index * 0.7} />)}
    </group>
  </group>
}

function Officials({ world }: { world: MatchWorldState }) {
  return <group>
    <StaffFigure position={[0, 0, 0]} color="#d8dc46" activity={world.phase === 'live' ? 0.9 : 0.3} phase={0} />
    <StaffFigure position={[0, 0, HALF_WIDTH + 0.7]} color="#d8dc46" activity={0.65} phase={1.2} />
    <StaffFigure position={[0, 0, -(HALF_WIDTH + 0.7)]} color="#d8dc46" activity={0.65} phase={2.4} />
    <StaffFigure position={[0, 0, HALF_WIDTH + 2.2]} color="#283236" activity={0.35} phase={3.1} />
  </group>
}

function Choreography({ world, homeColor, awayColor }: { world: MatchWorldState; homeColor: string; awayColor: string }) {
  if (world.crowd.choreography === 'none') return null
  const opacity = world.presentationPhase === 'intro' ? 0.88 : 0.25
  return <group>
    <mesh position={[0, 10.5, -(HALF_WIDTH + 11.2)]} rotation={[0.05, 0, 0]}>
      <planeGeometry args={[74, 9, 24, 5]} />
      <meshStandardMaterial color={world.crowd.choreography === 'championship' ? world.competition.colors[1] : homeColor} side={THREE.DoubleSide} transparent opacity={opacity} />
    </mesh>
    <mesh position={[0, 8.5, HALF_WIDTH + 11.2]} rotation={[-0.05, Math.PI, 0]}>
      <planeGeometry args={[52, 6.5, 18, 4]} />
      <meshStandardMaterial color={awayColor} side={THREE.DoubleSide} transparent opacity={opacity * 0.72} />
    </mesh>
  </group>
}

function Exterior({ world }: { world: MatchWorldState }) {
  if (!world.selection.exteriorSequence || !['arrival', 'entrance'].includes(world.phase)) return null
  const density = world.venue.exteriorDensity
  return <group position={[0, 0, HALF_WIDTH + 42]}>
    <mesh position={[-14, 1.4, 0]}><boxGeometry args={[13, 2.8, 3]} /><meshStandardMaterial color="#18324b" metalness={0.24} roughness={0.68} /></mesh>
    <mesh position={[-18.7, 0.45, -1.8]}><cylinderGeometry args={[0.55, 0.55, 0.35, 12]} /><meshStandardMaterial color="#101413" /></mesh>
    <mesh position={[-9.3, 0.45, -1.8]}><cylinderGeometry args={[0.55, 0.55, 0.35, 12]} /><meshStandardMaterial color="#101413" /></mesh>
    {Array.from({ length: Math.round(4 + density * 10) }, (_, index) => <StaffFigure key={index} position={[-2 + (index % 7) * 1.5, 0, -3 + Math.floor(index / 7) * 1.2]} color={index % 3 === 0 ? '#e3bd3b' : '#24302e'} activity={0.4} phase={index} />)}
    <Text position={[0, 5.5, 0]} fontSize={1.1} color="#f3f0e6" anchorX="center">{world.venue.name.toUpperCase()}</Text>
  </group>
}

function TrophyStage({ world }: { world: MatchWorldState }) {
  if (!world.ceremony.trophyVisible) return null
  return <group position={[0, 0, HALF_WIDTH + 6.2]}>
    <mesh position={[0, 0.35, 0]}><boxGeometry args={[18, 0.7, 4]} /><meshStandardMaterial color={world.competition.colors[0]} metalness={0.18} roughness={0.5} /></mesh>
    {world.ceremony.medalStageVisible && <mesh position={[0, 0.95, 0]}><boxGeometry args={[7, 0.5, 2.8]} /><meshStandardMaterial color={world.competition.colors[1]} metalness={0.3} /></mesh>}
    <group position={[0, 2, 0]}>
      <mesh><cylinderGeometry args={[0.65, 0.95, 1.8, 18]} /><meshPhysicalMaterial color="#d7aa31" metalness={0.82} roughness={0.18} clearcoat={0.5} /></mesh>
      {world.trophy.handles && <><mesh position={[-0.9, 0.25, 0]} rotation={[0, 0, Math.PI / 2]}><torusGeometry args={[0.55, 0.11, 10, 24, Math.PI * 1.5]} /><meshStandardMaterial color="#d7aa31" metalness={0.85} /></mesh><mesh position={[0.9, 0.25, 0]} rotation={[0, Math.PI, Math.PI / 2]}><torusGeometry args={[0.55, 0.11, 10, 24, Math.PI * 1.5]} /><meshStandardMaterial color="#d7aa31" metalness={0.85} /></mesh></>}
    </group>
    <Text position={[0, 4.2, 0]} fontSize={0.7} color="#ffffff" anchorX="center">{world.trophy.name}</Text>
  </group>
}

export function WorldLayer({ world, homeName, awayName, homeColor, awayColor }: WorldLayerProps) {
  return <group>
    <Architecture world={world} />
    <StadiumScreens world={world} homeName={homeName} awayName={awayName} />
    <MatchDayStaff world={world} />
    <Bench side={-1} world={world} color={homeColor} />
    <Bench side={1} world={world} color={awayColor} />
    <Officials world={world} />
    <Choreography world={world} homeColor={homeColor} awayColor={awayColor} />
    <Exterior world={world} />
    <TrophyStage world={world} />
  </group>
}
