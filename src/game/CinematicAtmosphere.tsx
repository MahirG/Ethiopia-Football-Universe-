import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { PresentationPhase, QualityLevel, TimeOfDay, Weather } from './types'

interface CinematicAtmosphereProps {
  timeOfDay: TimeOfDay
  weather: Weather
  weatherIntensity: number
  quality: QualityLevel
  matchProgress: number
  eventPulse: number
  presentationPhase: PresentationPhase
}

function createFlareTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 128
  const context = canvas.getContext('2d')
  if (context) {
    const gradient = context.createRadialGradient(64, 64, 0, 64, 64, 62)
    gradient.addColorStop(0, 'rgba(255,248,210,1)')
    gradient.addColorStop(0.16, 'rgba(255,214,128,.72)')
    gradient.addColorStop(0.5, 'rgba(255,170,90,.15)')
    gradient.addColorStop(1, 'rgba(255,150,80,0)')
    context.fillStyle = gradient
    context.fillRect(0, 0, 128, 128)
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

function CloudBank({ count, intensity }: { count: number; intensity: number }) {
  const groupRef = useRef<THREE.Group>(null)
  const clouds = useMemo(() => Array.from({ length: count }, (_, index) => ({
    x: -78 + (index * 19.3) % 156,
    y: 28 + (index % 4) * 3.7,
    z: -72 + (index * 31.7) % 144,
    scale: 4.8 + (index % 5) * 1.25,
  })), [count])

  useFrame((_, delta) => {
    if (!groupRef.current) return
    groupRef.current.position.x += delta * (0.5 + intensity * 1.8)
    if (groupRef.current.position.x > 22) groupRef.current.position.x = -22
  })

  return (
    <group ref={groupRef}>
      {clouds.map((cloud, index) => (
        <group key={index} position={[cloud.x, cloud.y, cloud.z]} scale={cloud.scale}>
          <mesh scale={[1.8, 0.45, 1]}>
            <sphereGeometry args={[1, 10, 7]} />
            <meshBasicMaterial color={intensity > 0.55 ? '#72818a' : '#d7dee0'} transparent opacity={0.16 + intensity * 0.18} depthWrite={false} />
          </mesh>
          <mesh position={[1.2, 0.08, 0.35]} scale={[1.25, 0.36, 0.8]}>
            <sphereGeometry args={[1, 9, 7]} />
            <meshBasicMaterial color={intensity > 0.55 ? '#667781' : '#e1e6e5'} transparent opacity={0.13 + intensity * 0.15} depthWrite={false} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

function Lightning({ active, intensity }: { active: boolean; intensity: number }) {
  const lightRef = useRef<THREE.PointLight>(null)
  const nextFlash = useRef(3 + Math.random() * 5)
  const flash = useRef(0)

  useFrame((state, delta) => {
    if (!lightRef.current) return
    if (!active) {
      lightRef.current.intensity = 0
      return
    }
    nextFlash.current -= delta
    if (nextFlash.current <= 0) {
      flash.current = 0.18 + Math.random() * 0.24
      nextFlash.current = 4 + Math.random() * 8
    }
    flash.current = Math.max(0, flash.current - delta)
    const flicker = flash.current > 0 ? 1 + Math.sin(state.clock.elapsedTime * 120) * 0.28 : 0
    lightRef.current.intensity = flash.current > 0 ? 18 * intensity * flicker : 0
  })

  return <pointLight ref={lightRef} position={[0, 34, 0]} color="#d9edff" distance={170} decay={1.4} />
}

function Confetti({ token, active, quality }: { token: number; active: boolean; quality: QualityLevel }) {
  const pointsRef = useRef<THREE.Points>(null)
  const count = quality === 'ultra' ? 900 : quality === 'balanced' ? 520 : 220
  const seedRef = useRef(token)
  const positions = useMemo(() => {
    const data = new Float32Array(count * 3)
    for (let index = 0; index < count; index += 1) {
      data[index * 3] = (Math.random() - 0.5) * 42
      data[index * 3 + 1] = 8 + Math.random() * 24
      data[index * 3 + 2] = (Math.random() - 0.5) * 28
    }
    return data
  }, [count])

  useFrame((state, delta) => {
    if (!pointsRef.current || !active) return
    if (seedRef.current !== token) {
      seedRef.current = token
      pointsRef.current.position.y = 0
    }
    pointsRef.current.position.y -= delta * 3.2
    pointsRef.current.rotation.y += delta * 0.12
    pointsRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.7) * 0.08
    if (pointsRef.current.position.y < -24) pointsRef.current.position.y = 0
  })

  if (!active) return null
  return (
    <points ref={pointsRef} frustumCulled={false}>
      <bufferGeometry><bufferAttribute attach="attributes-position" args={[positions, 3]} /></bufferGeometry>
      <pointsMaterial color="#f4ca3d" size={0.12} vertexColors={false} transparent opacity={0.8} depthWrite={false} />
    </points>
  )
}

export function CinematicAtmosphere({ timeOfDay, weather, weatherIntensity, quality, matchProgress, eventPulse, presentationPhase }: CinematicAtmosphereProps) {
  const flareTexture = useMemo(createFlareTexture, [])
  const dynamicNight = timeOfDay === 'dynamic' && matchProgress > 0.74
  const night = timeOfDay === 'night' || dynamicNight
  const golden = timeOfDay === 'golden' || (timeOfDay === 'dynamic' && matchProgress > 0.38 && matchProgress <= 0.74)
  const cloudIntensity = weather === 'rain' ? weatherIntensity : weather === 'overcast' ? 0.72 : 0.16
  const cloudCount = quality === 'ultra' ? 22 : quality === 'balanced' ? 14 : 8
  const celebration = eventPulse > 0 || presentationPhase === 'fulltime'

  return <>
    {(weather === 'rain' || weather === 'overcast') && <CloudBank count={cloudCount} intensity={cloudIntensity} />}
    <Lightning active={weather === 'rain' && weatherIntensity > 0.62} intensity={weatherIntensity} />
    {(golden || night) && quality !== 'performance' && <group position={golden ? [-48, 21, -30] : [0, 31, -42]}>
      <sprite scale={golden ? [13, 13, 1] : [8, 8, 1]}><spriteMaterial map={flareTexture} color={golden ? '#ffb76c' : '#d9e8ff'} transparent opacity={golden ? 0.62 : 0.28} depthWrite={false} blending={THREE.AdditiveBlending} /></sprite>
      {night && Array.from({ length: 4 }, (_, index) => <mesh key={index} position={[-42 + index * 28, -8, index % 2 === 0 ? 20 : -20]} rotation={[0, 0, index % 2 === 0 ? -0.22 : 0.22]}><coneGeometry args={[5.5, 48, 24, 1, true]} /><meshBasicMaterial color="#d9e6ff" transparent opacity={0.035} depthWrite={false} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} /></mesh>)}
    </group>}
    <Confetti token={eventPulse} active={celebration} quality={quality} />
  </>
}
