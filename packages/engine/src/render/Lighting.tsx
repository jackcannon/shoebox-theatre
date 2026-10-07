import { useFrame } from '@react-three/fiber'
import { useLayoutEffect, useMemo, useRef } from 'react'
import { Vector3, type DirectionalLight, type PointLight } from 'three'

import { useRuntime } from '../core/context'
import type { PointLightDefinition } from '../types'
import type { World } from '../world/World'

const SUN_DISTANCE = 60

function MapPointLight({ light, index }: { light: PointLightDefinition; index: number }) {
  const runtime = useRuntime()
  const ref = useRef<PointLight>(null)
  const intensity = light.intensity ?? 12
  useFrame(() => {
    if (!light.flicker || !ref.current) return
    const t = runtime.time * 7 + index * 13
    ref.current.intensity = intensity * (0.88 + 0.08 * Math.sin(t) + 0.04 * Math.sin(t * 2.7))
  })
  return (
    <pointLight
      ref={ref}
      position={light.position}
      color={light.color ?? '#ffcf8a'}
      intensity={intensity}
      distance={light.distance ?? 8}
      decay={2}
    />
  )
}

/** Sun (with a shadow frustum fitted to the whole rendered area), fill lights and point lights. */
export function Lighting({ world }: { world: World }) {
  const env = world.def.environment
  const map = world.map
  const sunRef = useRef<DirectionalLight>(null)
  const centre = useMemo(() => new Vector3(map.width / 2, 0, map.height / 2), [map])
  const extent = Math.hypot(map.width / 2 + map.border, map.height / 2 + map.border) + 1
  const shadowSize = extent > 14 ? 4096 : 2048
  const sunPosition = useMemo(() => {
    const dir = new Vector3(...(env.sun?.direction ?? [0, 1, 0])).normalize()
    return centre.clone().addScaledVector(dir, SUN_DISTANCE)
  }, [centre, env.sun])

  useLayoutEffect(() => {
    const light = sunRef.current
    if (!light) return
    light.target.position.copy(centre)
    light.target.updateMatrixWorld()
    const cam = light.shadow.camera
    cam.left = -extent
    cam.right = extent
    cam.top = extent
    cam.bottom = -extent
    cam.near = Math.max(0.5, SUN_DISTANCE - extent - 10)
    cam.far = SUN_DISTANCE + extent + 10
    cam.updateProjectionMatrix()
  }, [centre, extent])

  return (
    <>
      {env.ambient && <ambientLight color={env.ambient.color} intensity={env.ambient.intensity} />}
      {env.hemisphere && (
        <hemisphereLight args={[env.hemisphere.sky, env.hemisphere.ground, env.hemisphere.intensity]} />
      )}
      {env.sun && (
        <directionalLight
          ref={sunRef}
          castShadow
          position={sunPosition}
          color={env.sun.color}
          intensity={env.sun.intensity}
          shadow-mapSize={[shadowSize, shadowSize]}
          shadow-bias={-0.0004}
          shadow-normalBias={0.025}
        />
      )}
      {env.lights?.map((light, i) => <MapPointLight key={i} light={light} index={i} />)}
    </>
  )
}
