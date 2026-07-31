import { forwardRef, useImperativeHandle, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { BallCollider, RigidBody, type RapierRigidBody } from '@react-three/rapier'
import * as THREE from 'three'
import './game.css'
import { BALL_RADIUS } from './config'
import type { QualityLevel, Weather } from './types'
import type { MatchWorldState } from '../world/types'

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
    if (speed > 1.5) {
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
