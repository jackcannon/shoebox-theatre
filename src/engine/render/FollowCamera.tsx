import { useFrame, useThree } from '@react-three/fiber'
import { useLayoutEffect, useMemo, useRef } from 'react'
import { PerspectiveCamera, Vector3 } from 'three'

import { damp } from '../math'
import type { World } from '../world/World'

import { clampCameraTarget, northOverhang, resolveCamera } from './camera'

/** Fixed-angle perspective camera that eases after the player, like a diorama viewed from above. */
export function FollowCamera({ world }: { world: World }) {
  const camera = useThree((s) => s.camera)
  const size = useThree((s) => s.size)
  const settings = useMemo(() => resolveCamera(world.def), [world])
  const overhang = useMemo(() => {
    const { map } = world
    let height = 0
    for (let z = 0; z < map.height; z++) {
      for (let x = 0; x < map.width; x++) height = Math.max(height, map.get(x, z)?.height ?? 0)
    }
    return northOverhang(height, settings)
  }, [world, settings])
  const target = useRef(new Vector3())
  const snapped = useRef(false)

  useLayoutEffect(() => {
    if (camera instanceof PerspectiveCamera) {
      camera.fov = settings.fov
      camera.updateProjectionMatrix()
    }
    snapped.current = false
  }, [camera, settings])

  useFrame((_, dt) => {
    const { map, player } = world
    const border = map.border
    const [x, z] = clampCameraTarget(
      player.x,
      player.z,
      { minX: -border, maxX: map.width + border, minZ: -border - overhang, maxZ: map.height + border },
      settings,
      size.width / Math.max(1, size.height),
    )
    const t = target.current
    if (!snapped.current) {
      t.set(x, player.y, z)
      snapped.current = true
    } else {
      t.x = damp(t.x, x, 5, dt)
      t.y = damp(t.y, player.y, 5, dt)
      t.z = damp(t.z, z, 5, dt)
    }
    const pitch = (settings.pitch * Math.PI) / 180
    camera.position.set(t.x, t.y + Math.sin(pitch) * settings.distance, t.z + Math.cos(pitch) * settings.distance)
    camera.lookAt(t)
  }, -1)

  return null
}
