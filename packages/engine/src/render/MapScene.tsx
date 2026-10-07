import { useMemo } from 'react'

import { useRuntime } from '../core/context'
import { hashTile } from '../math'
import type { DecorationInstance } from '../types'
import type { World } from '../world/World'

import { CharacterSprite } from './CharacterSprite'
import { FollowCamera } from './FollowCamera'
import { spriteStretch } from './camera'
import { Lighting } from './Lighting'
import { Particles } from './Particles'
import { Terrain } from './Terrain'
import { Water } from './Water'

function Decorations({ world }: { world: World }) {
  const runtime = useRuntime()
  const groups = useMemo(() => {
    const map = world.map
    const byId = new Map<string, DecorationInstance[]>()
    const b = map.border
    for (let z = -b; z < map.height + b; z++) {
      for (let x = -b; x < map.width + b; x++) {
        const tile = map.getClamped(x, z)
        if (!tile.decoration) continue
        const list = byId.get(tile.decoration) ?? []
        list.push({ x, z, y: tile.height ?? 0, seed: hashTile(x, z), inMap: map.inBounds(x, z) })
        byId.set(tile.decoration, list)
      }
    }
    return [...byId]
  }, [world])

  return groups.map(([id, instances]) => {
    const Decoration = runtime.decorations[id]
    if (!Decoration) {
      console.warn(`No decoration registered for "${id}"`)
      return null
    }
    return <Decoration key={id} id={id} instances={instances} map={world.map} />
  })
}

function Objects({ world }: { world: World }) {
  const runtime = useRuntime()
  return (world.def.objects ?? []).map((object, i) => {
    const Prefab = runtime.prefabs[object.type]
    if (!Prefab) {
      console.warn(`No prefab registered for "${object.type}"`)
      return null
    }
    const w = object.w ?? 1
    const d = object.d ?? 1
    const y = world.map.heightAt(object.x + w / 2, object.y + d / 2)
    return (
      <group key={i} position={[object.x, y, object.y]}>
        <Prefab object={object} w={w} d={d} />
      </group>
    )
  })
}

/** Everything rendered for one loaded map. Remounted on every map change. */
export function MapScene({ world }: { world: World }) {
  const env = world.def.environment
  return (
    <>
      <color attach="background" args={[env.background]} />
      {env.fog && <fog attach="fog" args={[env.fog.color, env.fog.near, env.fog.far]} />}
      <Lighting world={world} />
      <Terrain map={world.map} />
      <Water map={world.map} />
      <Decorations world={world} />
      <Objects world={world} />
      {world.characters.map((c) => (
        <CharacterSprite key={c.id} character={c} stretch={spriteStretch(world.def)} />
      ))}
      {env.particles && <Particles world={world} {...env.particles} />}
      <FollowCamera world={world} />
    </>
  )
}
