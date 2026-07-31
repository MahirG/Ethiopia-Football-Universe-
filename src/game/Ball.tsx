import { forwardRef, useImperativeHandle, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { BallCollider, RigidBody, type RapierRigidBody } from '@react-three/rapier'
import * as THREE from 'three'
import './game.css'
import { BALL_RADIUS } from './config'
import type { QualityLevel, Weather } from './types'
import type { MatchWorldState } from '../world/types'
import { CoreMatchGameplayEngine } from '../core/engine'
import type { CorePlayerSnapshot, SurfaceSnapshot } from '../core/types'
import { getActiveHumanWorld } from '../human/world'

interface BallProps {
  weather: Weather
  quality: QualityLevel
  world: MatchWorldState
}

const PANEL_DIRECTIONS = [
  new THREE.Vector3(0, 1, 0), new THREE.Vector3(0.76, 0.38, 0.52), new THREE.Vector3(-0.76, 0.38, 0.52),
  new THREE.Vector3(0.76, 0.38, -0.52), new THREE.Vector3(-0.76, 0.38, -0.52), new THREE.Vector3(0, -0.82, 0.57), new THREE.Vector3(0, -0.82, -0.57),
].map((value) => value.normalize())

function BallPanel({ direction, color, panelScale }: { direction: THREE.Vector3; color: string; panelScale: number }) {
  const quaternion = useMemo(() => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), direction), [direction])
  return <mesh position={direction.clone().multiplyScalar(BALL_RADIUS * 1.005)} quaternion={quaternion}><circleGeometry args={[BALL_RADIUS * panelScale, 5]} /><meshPhysicalMaterial color={color} roughness={0.62} clearcoat={0.1} polygonOffset polygonOffsetFactor={-2} /></mesh>
}

export const Football = forwardRef<RapierRigidBody, BallProps>(function Football({ weather, quality, world }, forwardedRef) {
  const bodyRef = useRef<RapierRigidBody>(null)
  const meshRef = useRef<THREE.Group>(null)
  const trailRefs = useRef<Array<THREE.Mesh | null>>([])
  const trailPositions = useRef(Array.from({ length: 6 }, () => new THREE.Vector3(0, -20, 0)))
  const linearVector = useMemo(() => new THREE.Vector3(), [])
  const angularVector = useMemo(() => new THREE.Vector3(), [])
  const magnusVector = useMemo(() => new THREE.Vector3(), [])
  const dragVector = useMemo(() => new THREE.Vector3(), [])
  const coreEngine = useRef(new CoreMatchGameplayEngine())
  const lastCoreRestart = useRef('')
  const coreTelemetryElapsed = useRef(0)
  const lastCoreProgress = useRef(0)
  const ball = world.ball
  const wetness = weather === 'rain' || weather === 'storm' || weather === 'snow' ? world.pitch.moisture : 0

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
    const humanWorld = getActiveHumanWorld()
    if (humanWorld) {
      const players: CorePlayerSnapshot[] = humanWorld.world.players.map((player) => ({
        id: player.id,
        team: player.team,
        index: player.index,
        role: player.role,
        position: { x: player.position.x, y: player.position.y, z: player.position.z },
        velocity: { x: player.velocity.x, y: player.velocity.y, z: player.velocity.z },
        facing: player.facing,
        fatigue: player.physical.fatigue,
        balance: player.physical.balance,
        strength: player.role === 'goalkeeper' || player.role === 'centre-back' ? 0.82 : 0.68,
        awareness: player.onBall ? 0.88 : 0.74,
        discipline: 0.78,
        reaction: player.role === 'goalkeeper' ? 0.88 : 0.76,
        onBall: player.onBall,
        action: player.action,
      }))
      const nearest = players.reduce<CorePlayerSnapshot | null>((best, player) => {
        const currentDistance = Math.hypot(player.position.x - translation.x, player.position.y - translation.y, player.position.z - translation.z)
        if (!best) return player
        const bestDistance = Math.hypot(best.position.x - translation.x, best.position.y - translation.y, best.position.z - translation.z)
        return currentDistance < bestDistance ? player : best
      }, null)
      const nearestDistance = nearest ? Math.hypot(nearest.position.x - translation.x, nearest.position.y - translation.y, nearest.position.z - translation.z) : Infinity
      const surface: SurfaceSnapshot = {
        grip: world.pitch.grip,
        rollingResistance: world.pitch.rollingResistance,
        restitution: world.pitch.bounce,
        wetness,
        unevenness: world.selection.surfaceWear * 0.08,
        altitudeMeters: world.venue.altitudeM,
        temperatureC: world.pitch.temperatureC,
        wind: { x: weather === 'storm' ? 2.2 : weather === 'wind' ? 1.3 : 0.15, y: 0, z: weather === 'storm' ? 6.4 : weather === 'wind' ? 4.1 : 0.35 },
      }
      const simulationRunning = humanWorld.world.matchProgress > lastCoreProgress.current + 1e-7
      lastCoreProgress.current = humanWorld.world.matchProgress
      const coreResult = coreEngine.current.tick({
        delta,
        simulationTime: humanWorld.world.matchProgress * 90 * 60,
        matchMinute: humanWorld.world.matchProgress * 90,
        running: simulationRunning,
        scoreHome: humanWorld.world.scoreHome,
        scoreAway: humanWorld.world.scoreAway,
        weather: humanWorld.world.weather,
        weatherIntensity: humanWorld.world.weatherIntensity,
        ball: {
          position: { x: translation.x, y: translation.y, z: translation.z },
          velocity: { x: linear.x, y: linear.y, z: linear.z },
          angularVelocity: { x: angular.x, y: angular.y, z: angular.z },
          radius: BALL_RADIUS,
          lastTouchPlayerId: nearestDistance < 1.35 ? nearest?.id ?? null : null,
          lastTouchTeam: nearestDistance < 1.35 ? nearest?.team ?? null : null,
        },
        players,
        surface,
      })
      const acceleration = coreResult.environmentalAcceleration
      body.applyImpulse({ x: acceleration.x * delta * ball.massKg, y: acceleration.y * delta * ball.massKg, z: acceleration.z * delta * ball.massKg }, true)
      if (coreResult.newRestart) {
        const restart = coreResult.newRestart
        const key = `${restart.type}:${restart.team ?? 'neutral'}:${Math.round(restart.location.x)}:${Math.round(restart.location.z)}`
        const beyondSafetyBoundary = Math.abs(translation.x) > 59 || Math.abs(translation.z) > 40 || translation.y < -2
        if (key !== lastCoreRestart.current && beyondSafetyBoundary && !coreResult.ruleDecision.goal) {
          lastCoreRestart.current = key
          body.setTranslation({ x: restart.location.x, y: Math.max(BALL_RADIUS + 0.07, restart.location.y), z: restart.location.z }, true)
          body.setLinvel({ x: 0, y: 0, z: 0 }, true)
          body.setAngvel({ x: 0, y: 0, z: 0 }, true)
        }
      } else {
        lastCoreRestart.current = ''
      }
      coreTelemetryElapsed.current += delta
      if (coreTelemetryElapsed.current >= 0.5 && typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('efu:core-telemetry', { detail: coreResult.telemetry }))
        coreTelemetryElapsed.current = 0
      }
    } else if (speed > 1.5) {
      magnusVector.crossVectors(angularVector, linearVector).multiplyScalar(0.00016 * ball.magnusCoefficient * ball.spinRetention * delta)
      dragVector.copy(linearVector).multiplyScalar(-0.00052 * ball.dragCoefficient / 0.19 * speed * delta)
      body.applyImpulse({ x: magnusVector.x + dragVector.x, y: magnusVector.y + dragVector.y, z: magnusVector.z + dragVector.z }, true)
    }
    if (meshRef.current) {
      const compression = translation.y < BALL_RADIUS + 0.035 ? THREE.MathUtils.clamp((speed - 4) / (70 + ball.pressureBar * 20), 0, 0.12) : 0
      meshRef.current.scale.set(1 + compression * 0.48, 1 - compression, 1 + compression * 0.48)
      const contamination = THREE.MathUtils.clamp(world.pitch.mud * 0.25 + wetness * ball.waterAbsorption * 0.8 + world.selection.surfaceWear * 0.08, 0, 0.32)
      meshRef.current.rotation.z += angular.z * delta * 0.015
      meshRef.current.traverse((object) => {
        const material = (object as THREE.Mesh).material
        if (material && !Array.isArray(material) && 'roughness' in material) (material as THREE.MeshPhysicalMaterial).roughness = THREE.MathUtils.clamp(ball.roughness + contamination, 0.2, 0.95)
      })
    }
    if (quality !== 'performance') {
      for (let index = trailPositions.current.length - 1; index > 0; index -= 1) trailPositions.current[index].copy(trailPositions.current[index - 1])
      trailPositions.current[0].set(translation.x, translation.y, translation.z)
      for (let index = 0; index < trailRefs.current.length; index += 1) {
        const trail = trailRefs.current[index]
        if (!trail) continue
        trail.position.copy(trailPositions.current[index] ?? trailPositions.current[0])
        trail.visible = speed > 17
        trail.scale.setScalar(Math.max(0.18, 0.78 - index * 0.09))
        ;(trail.material as THREE.MeshBasicMaterial).opacity = speed > 17 ? Math.max(0, 0.13 - index * 0.019) : 0
      }
    }
  })

  const radiusScale = ball.size === 4 ? 0.94 : 1
  const friction = Math.max(0.08, ball.rollingFriction * world.pitch.rollingResistance * 0.48)
  return <>
    <RigidBody ref={bodyRef} colliders={false} position={[0, BALL_RADIUS + 0.07, 0]} restitution={ball.restitution * world.pitch.bounce} friction={friction} linearDamping={Math.max(0.06, 0.24 * ball.rollingFriction * world.pitch.rollingResistance)} angularDamping={Math.max(0.08, 0.2 / ball.spinRetention)} canSleep={false} ccd name="match-ball">
      <BallCollider args={[BALL_RADIUS * radiusScale]} density={ball.massKg / ((4 / 3) * Math.PI * BALL_RADIUS ** 3)} />
      <group ref={meshRef} scale={radiusScale}>
        <mesh castShadow receiveShadow><icosahedronGeometry args={[BALL_RADIUS, quality === 'performance' ? 3 : 5]} /><meshPhysicalMaterial color={ball.baseColor} roughness={ball.roughness} clearcoat={wetness > 0 ? 0.5 : 0.22} clearcoatRoughness={0.42} sheen={0.08} /></mesh>
        {PANEL_DIRECTIONS.map((direction, index) => <BallPanel key={index} direction={direction} color={ball.accentColor} panelScale={Math.max(0.12, Math.min(0.25, 0.16 + 12 / ball.panelCount * 0.08))} />)}
        <mesh scale={1.006}><icosahedronGeometry args={[BALL_RADIUS, 2]} /><meshBasicMaterial color={ball.accentColor} wireframe transparent opacity={0.13 + ball.seamDepthMm * 0.025} /></mesh>
      </group>
    </RigidBody>
    {quality !== 'performance' && Array.from({ length: 6 }, (_, index) => <mesh key={index} ref={(value) => { trailRefs.current[index] = value }} visible={false} renderOrder={-1}><sphereGeometry args={[BALL_RADIUS * 0.72, 10, 10]} /><meshBasicMaterial color={ball.highVisibility ? '#f4e733' : '#eef7f1'} transparent opacity={0} depthWrite={false} /></mesh>)}
  </>
})
