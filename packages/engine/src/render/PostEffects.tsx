import { useFrame } from '@react-three/fiber'
import { Bloom, EffectComposer, HueSaturation, TiltShift2, ToneMapping, Vignette } from '@react-three/postprocessing'
import type { TiltShiftEffect } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import { useMemo, useRef } from 'react'
import { Vector3 } from 'three'

import type { World } from '../world/World'

/**
 * The engine's look: bloom on bright pixels, a tilt-shift blur whose focus line follows the player,
 * gentle grading and a vignette.
 */
export function PostEffects({ world }: { world: World }) {
  const fx = { bloom: 0.55, tiltShift: 0.12, vignette: 0.55, saturation: 0, ...world.def.environment.postfx }
  const tiltX = useRef<TiltShiftEffect>(null)
  const tiltY = useRef<TiltShiftEffect>(null)
  const projected = useMemo(() => new Vector3(), [])

  useFrame(({ camera }) => {
    const { player } = world
    projected.set(player.x, player.y + 0.8, player.z).project(camera)
    const y = Math.min(0.8, Math.max(0.2, (projected.y + 1) / 2))
    for (const effect of [tiltX.current, tiltY.current]) {
      if (!effect) continue
      effect.start = [0, y]
      effect.end = [1, y]
    }
  })

  return (
    <EffectComposer multisampling={4}>
      <Bloom mipmapBlur intensity={fx.bloom} luminanceThreshold={0.85} luminanceSmoothing={0.3} radius={0.7} />
      <TiltShift2 ref={tiltX} blur={fx.tiltShift} taper={0.3} direction={[1, 0]} samples={10} />
      <TiltShift2 ref={tiltY} blur={fx.tiltShift} taper={0.3} direction={[0, 1]} samples={10} />
      <HueSaturation saturation={fx.saturation} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      <Vignette offset={0.3} darkness={fx.vignette} />
    </EffectComposer>
  )
}
