import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { HALF_LENGTH, HALF_WIDTH } from './config'
import { QUALITY_PRESETS } from './quality'
import type { QualityLevel, Weather } from './types'

interface GrassFieldProps {
  quality: QualityLevel
  weather: Weather
}

interface GrassShader {
  uniforms: {
    uTime: { value: number }
    uWind: { value: number }
    uWetness: { value: number }
  }
}

function seeded(index: number) {
  const value = Math.sin(index * 73.156 + 19.47) * 43758.5453
  return value - Math.floor(value)
}

export function GrassField({ quality, weather }: GrassFieldProps) {
  const count = QUALITY_PRESETS[quality].grassBlades
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const shaderRef = useRef<GrassShader | null>(null)
  const geometry = useMemo(() => {
    const value = new THREE.PlaneGeometry(0.045, 0.25, 1, 2)
    value.translate(0, 0.125, 0)
    return value
  }, [])
  const material = useMemo(() => {
    const value = new THREE.MeshStandardMaterial({
      color: '#2f9d5a',
      roughness: weather === 'rain' ? 0.58 : 0.94,
      metalness: weather === 'rain' ? 0.05 : 0,
      side: THREE.DoubleSide,
      vertexColors: true,
    })
    value.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = { value: 0 }
      shader.uniforms.uWind = { value: weather === 'wind' ? 1.8 : weather === 'rain' ? 0.72 : 0.42 }
      shader.uniforms.uWetness = { value: weather === 'rain' ? 1 : 0 }
      shader.vertexShader = `uniform float uTime; uniform float uWind;\n${shader.vertexShader}`
      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        #ifdef USE_INSTANCING
          float grassPhase = instanceMatrix[3].x * 0.17 + instanceMatrix[3].z * 0.13;
          float grassSway = sin(uTime * 2.15 + grassPhase) * 0.055 * uWind;
          transformed.x += grassSway * uv.y;
          transformed.z += cos(uTime * 1.6 + grassPhase) * 0.025 * uWind * uv.y;
        #endif`,
      )
      shaderRef.current = shader as unknown as GrassShader
    }
    value.customProgramCacheKey = () => `efu-grass-${weather}`
    return value
  }, [weather])

  useLayoutEffect(() => {
    if (!meshRef.current || count === 0) return
    const dummy = new THREE.Object3D()
    const color = new THREE.Color()
    for (let index = 0; index < count; index += 1) {
      const x = (seeded(index * 3) - 0.5) * (HALF_LENGTH * 2 - 0.5)
      const z = (seeded(index * 3 + 1) - 0.5) * (HALF_WIDTH * 2 - 0.5)
      const scale = 0.72 + seeded(index * 3 + 2) * 0.66
      dummy.position.set(x, 0.02, z)
      dummy.rotation.set(0, seeded(index + 800) * Math.PI, 0)
      dummy.scale.set(0.82 + seeded(index + 400) * 0.34, scale, 1)
      dummy.updateMatrix()
      meshRef.current.setMatrixAt(index, dummy.matrix)
      color.setHSL(0.34 + seeded(index + 1200) * 0.018, 0.48 + seeded(index + 900) * 0.16, 0.28 + seeded(index + 500) * 0.1)
      meshRef.current.setColorAt(index, color)
    }
    meshRef.current.instanceMatrix.needsUpdate = true
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true
  }, [count])

  useFrame(({ clock }) => {
    if (!shaderRef.current) return
    shaderRef.current.uniforms.uTime.value = clock.elapsedTime
  })

  useEffect(() => () => {
    geometry.dispose()
    material.dispose()
  }, [geometry, material])

  if (count === 0) return null

  return <instancedMesh ref={meshRef} args={[geometry, material, count]} frustumCulled receiveShadow={false} castShadow={false} />
}
