import { describe, expect, it } from 'vitest'
import { World } from 'shoeboxtheatre'

import { gameConfig } from '../config'

const { maps, player } = gameConfig

describe.each(Object.values(maps).map((def) => [def.id, def] as const))('map %s', (id, def) => {
  const world = new World(def, player, { map: id, x: 0, y: 0 })
  const walkable = (x: number, y: number) => world.map.inBounds(x, y) && !world.isTileSolid(x, y)

  it('is registered under its own id', () => {
    expect(maps[id]).toBe(def)
  })

  it('has rows of equal width', () => {
    for (const [z, row] of def.tiles.entries()) expect(row.length, `row ${z}`).toBe(def.tiles[0].length)
  })

  it('has warps whose targets exist and land on an in-bounds, walkable tile', () => {
    for (const warp of def.warps ?? []) {
      const label = `warp at ${warp.x},${warp.y} → ${warp.to.map} ${warp.to.x},${warp.to.y}`
      expect(walkable(warp.x, warp.y), `${label} (source)`).toBe(true)
      const target = maps[warp.to.map]
      expect(target, label).toBeDefined()
      const targetWorld = new World(target, player, warp.to)
      expect(targetWorld.map.inBounds(warp.to.x, warp.to.y), label).toBe(true)
      expect(targetWorld.isTileSolid(warp.to.x, warp.to.y), label).toBe(false)
    }
  })

  it('has NPCs standing on walkable tiles', () => {
    for (const npc of def.npcs ?? []) expect(walkable(npc.x, npc.y), `${npc.id} at ${npc.x},${npc.y}`).toBe(true)
  })
})

describe('gameConfig', () => {
  it('starts on a walkable tile of an existing map', () => {
    const { start } = gameConfig
    const world = new World(maps[start.map], player, start)
    expect(world.isTileSolid(start.x, start.y)).toBe(false)
  })
})
