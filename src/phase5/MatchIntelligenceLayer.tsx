import { Line, Text } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import * as THREE from 'three'
import { HALF_WIDTH } from '../game/config'
import type { CompetitiveMatchState, CompetitiveSettings } from './types'

function Official({ position, color, assistant = false }: { position: [number, number, number]; color: string; assistant?: boolean }) {
  const group = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (group.current) group.current.position.y = position[1] + Math.sin(clock.elapsedTime * 3 + position[0]) * 0.035
  })
  return <group ref={group} position={position}>
    <mesh castShadow><capsuleGeometry args={[0.16, 0.72, 4, 8]} /><meshStandardMaterial color={color} roughness={0.72} /></mesh>
    <mesh position={[0, 0.65, 0]} castShadow><sphereGeometry args={[0.18, 12, 10]} /><meshStandardMaterial color="#6f4534" roughness={0.88} /></mesh>
    {assistant && <group position={[0.28, 0.2, 0]} rotation={[0, 0, -0.3]}><mesh><cylinderGeometry args={[0.018, 0.018, 0.8, 6]} /><meshStandardMaterial color="#d8ded9" /></mesh><mesh position={[0, 0.32, 0]}><planeGeometry args={[0.44, 0.3]} /><meshStandardMaterial color="#f6dc37" side={THREE.DoubleSide} /></mesh></group>}
  </group>
}

export function MatchIntelligenceLayer({ state, settings }: { state: CompetitiveMatchState; settings: CompetitiveSettings }) {
  const refereeX = THREE.MathUtils.clamp((state.telemetry.home.averageX + state.telemetry.away.averageX) * 0.24, -24, 24)
  const refereeZ = THREE.MathUtils.clamp((state.telemetry.home.averageZ + state.telemetry.away.averageZ) * 0.4, -14, 14)
  const lineX = state.pendingOffside?.lineX ?? (state.possession === 'away' ? state.telemetry.offsideLineAway : state.telemetry.offsideLineHome)
  return <group>
    <Official position={[refereeX, 0.55, refereeZ]} color="#25c79a" />
    <Official position={[0, 0.55, -HALF_WIDTH - 0.8]} color="#f0bc36" assistant />
    <Official position={[0, 0.55, HALF_WIDTH + 0.8]} color="#f0bc36" assistant />
    {settings.visibleOffsideLines && state.pendingOffside && <Line points={[[lineX, 0.08, -HALF_WIDTH], [lineX, 0.08, HALF_WIDTH]]} color="#ffcf39" lineWidth={2} transparent opacity={0.82} />}
    {state.restart && <>
      <mesh position={state.restart.position} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[0.52, 0.68, 40]} /><meshBasicMaterial color="#ffca3a" transparent opacity={0.88} /></mesh>
      <Text position={[state.restart.position[0], 2.4, state.restart.position[2]]} fontSize={0.62} color="#fff6cf" anchorX="center" outlineWidth={0.018} outlineColor="#111">{state.restart.type.toUpperCase()}</Text>
    </>}
    {state.varReview && <group position={[0, 7, -39]}><mesh><boxGeometry args={[12, 3.3, 0.3]} /><meshStandardMaterial color="#081612" emissive="#0a3a2c" emissiveIntensity={1.6} /></mesh><Text position={[0, 0.15, 0.18]} fontSize={0.72} color="#f7f0d6" anchorX="center">VAR · CHECKING {state.varReview.type.toUpperCase()}</Text></group>}
  </group>
}
