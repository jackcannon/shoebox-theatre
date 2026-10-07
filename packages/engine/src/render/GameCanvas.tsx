import { Canvas, useFrame } from '@react-three/fiber'

import { useRuntime, useUI } from '../core/context'

import { MapScene } from './MapScene'
import { PostEffects } from './PostEffects'
import { windUniforms } from './wind'

function GameLoop() {
  const runtime = useRuntime()
  useFrame((_, delta) => {
    const dt = Math.min(delta, 1 / 20)
    runtime.update(dt)
    windUniforms.uWindTime.value = runtime.time
  }, -2)
  return null
}

export function GameCanvas() {
  const runtime = useRuntime()
  const worldId = useUI((s) => s.worldId)
  const world = runtime.world

  return (
    <Canvas
      className="shoebox-canvas"
      shadows="percentage"
      dpr={[1, 2]}
      gl={{ antialias: false, powerPreference: 'high-performance' }}
      camera={{ fov: 30, near: 0.5, far: 220, position: [0, 12, 16] }}
    >
      <GameLoop />
      {world && <MapScene key={worldId} world={world} />}
      {world && <PostEffects key={`fx-${worldId}`} world={world} />}
    </Canvas>
  )
}
