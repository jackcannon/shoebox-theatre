import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { AdditiveBlending, type Points } from 'three'

import { useRuntime } from '../core/context'
import type { World } from '../world/World'

const SPREAD_X = 24
const SPREAD_Z = 18

/** Glowing motes drifting around the player: pollen outdoors, dust in sunbeams indoors. */
export function Particles({ world, count, color, size = 0.08 }: { world: World; count: number; color: string; size?: number }) {
  const runtime = useRuntime()
  const ref = useRef<Points>(null)
  const { positions, colors, seeds } = useMemo(() => {
    const p = world.player
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)
    const seeds = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      positions[i * 3] = p.x + (Math.random() - 0.5) * SPREAD_X
      positions[i * 3 + 1] = Math.random() * 3
      positions[i * 3 + 2] = p.z + (Math.random() - 0.5) * SPREAD_Z
      seeds[i] = Math.random()
    }
    return { positions, colors, seeds }
  }, [count, world])

  useFrame((_, dt) => {
    const points = ref.current
    if (!points) return
    const p = world.player
    const t = runtime.time
    for (let i = 0; i < count; i++) {
      const s = seeds[i]
      const j = i * 3
      positions[j] += Math.sin(t * 0.6 + s * 40) * dt * 0.2
      positions[j + 1] += (0.06 + s * 0.12) * dt
      positions[j + 2] += Math.cos(t * 0.45 + s * 25) * dt * 0.12
      const far = Math.abs(positions[j] - p.x) > SPREAD_X / 2 || Math.abs(positions[j + 2] - p.z) > SPREAD_Z / 2
      if (positions[j + 1] > 3.2 || far) {
        positions[j] = p.x + (Math.random() - 0.5) * SPREAD_X
        positions[j + 1] = Math.random() * 0.4
        positions[j + 2] = p.z + (Math.random() - 0.5) * SPREAD_Z
      }
      const glow = Math.max(0, Math.sin(t * (1 + s) + s * 30)) * Math.min(1, (3.2 - positions[j + 1]) * 1.5)
      colors[j] = colors[j + 1] = colors[j + 2] = glow
    }
    points.geometry.attributes.position.needsUpdate = true
    points.geometry.attributes.color.needsUpdate = true
  })

  return (
    <points ref={ref} frustumCulled={false} renderOrder={5}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        map={runtime.assets.texture('dot')}
        color={color}
        size={size}
        vertexColors
        transparent
        depthWrite={false}
        blending={AdditiveBlending}
      />
    </points>
  )
}
