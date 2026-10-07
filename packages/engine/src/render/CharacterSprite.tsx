import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { DoubleSide, type Group, type Mesh } from 'three'

import { SPRITE_ROWS } from '../assets/AssetManager'
import { useRuntime } from '../core/context'
import type { Character } from '../world/Character'

/** Upright pixel-art sprite that casts a real shadow, plus a soft contact shadow on the ground. */
export function CharacterSprite({ character, stretch }: { character: Character; stretch: number }) {
  const runtime = useRuntime()
  const sheet = useMemo(() => runtime.assets.spriteSheet(character.sprite), [runtime, character.sprite])
  const texture = useMemo(() => {
    const t = sheet.texture.clone()
    t.repeat.set(1 / sheet.columns, 1 / sheet.rows)
    return t
  }, [sheet])
  useEffect(() => () => texture.dispose(), [texture])

  const width = sheet.frameWidth / sheet.pixelsPerUnit
  const height = (sheet.frameHeight / sheet.pixelsPerUnit) * stretch
  const diagonals = sheet.rows > SPRITE_ROWS.upRight
  const group = useRef<Group>(null)
  const body = useRef<Mesh>(null)

  useFrame(() => {
    if (!group.current || !body.current) return
    group.current.position.set(character.x, character.y, character.z)
    const frame = character.frame()
    const bob = character.moving && frame === 0 ? stretch / sheet.pixelsPerUnit : 0
    body.current.position.y = height / 2 + bob
    const row = SPRITE_ROWS[diagonals ? character.heading : character.facing]
    texture.offset.set(frame / sheet.columns, 1 - (row + 1) / sheet.rows)
  })

  return (
    <group ref={group}>
      <mesh ref={body} castShadow receiveShadow renderOrder={4}>
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial
          map={texture}
          alphaTest={0.5}
          transparent
          depthWrite
          side={DoubleSide}
          roughness={1}
          metalness={0}
        />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position-y={0.015} renderOrder={2}>
        <planeGeometry args={[width * 0.85, width * 0.45]} />
        <meshBasicMaterial map={runtime.assets.texture('blob')} transparent depthWrite={false} />
      </mesh>
    </group>
  )
}
