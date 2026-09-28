import { describe, expect, it } from 'vitest'
import type { MapDefinition, WarpTarget } from '../types'
import { World, facingFromInput } from './World'

const DT = 1 / 60

function createWorld(overrides: Partial<MapDefinition>, spawn: Omit<WarpTarget, 'map'>): World {
  const def: MapDefinition = {
    id: 'test',
    name: 'Test',
    tiles: ['#####', '#...#', '#...#', '#####'],
    palette: { '#': { ground: 'stone', solid: true }, '.': { ground: 'grass' } },
    environment: { background: '#000000' },
    ...overrides,
  }
  return new World(def, { sprite: 'hero' }, { map: 'test', ...spawn })
}

function hold(world: World, x: number, z: number, seconds: number) {
  for (let t = 0; t < seconds; t += DT) world.update(DT, { x, z, run: false })
}

describe('World player movement', () => {
  it('stops against solid tiles', () => {
    const world = createWorld({}, { x: 1, y: 1 })
    const { player } = world
    hold(world, -1, 0, 1)
    expect(player.x).toBeCloseTo(1 + player.radius)
    expect(player.facing).toBe('left')
    hold(world, 1, 0, 1)
    expect(player.x).toBeCloseTo(4 - player.radius)
    hold(world, 0, -1, 1)
    expect(player.z).toBeCloseTo(1 + player.radius)
    expect(player.facing).toBe('up')
  })

  it('treats solid object footprints as walls', () => {
    const world = createWorld({ objects: [{ type: 'table', x: 2, y: 1 }] }, { x: 1, y: 1 })
    hold(world, 1, 0, 1)
    expect(world.player.x).toBeCloseTo(2 - world.player.radius)
  })

  it('stops short of NPCs', () => {
    const world = createWorld({ npcs: [{ id: 'friend', sprite: 'hero', x: 3, y: 1 }] }, { x: 1, y: 1 })
    hold(world, 1, 0, 1)
    expect(world.player.x).toBeCloseTo(3.5 - 0.45 - world.player.radius)
  })

  it('nudges the player sideways into a 1-tile gap', () => {
    const world = createWorld({ tiles: ['#.###', '#...#', '#...#', '#####'] }, { x: 1, y: 1 })
    world.player.x = 1.9
    hold(world, 0, -1, 1)
    expect(world.player.tileX).toBe(1)
    expect(world.player.tileZ).toBe(0)
  })
})

describe('World.findInteraction', () => {
  it('finds the NPC in front of the player', () => {
    const world = createWorld(
      { npcs: [{ id: 'friend', sprite: 'hero', x: 3, y: 1 }] },
      { x: 2, y: 1, facing: 'right' },
    )
    expect(world.findInteraction().npc?.id).toBe('friend')
    world.player.facing = 'down'
    expect(world.findInteraction()).toEqual({})
  })

  it('finds an object with text in front of the player', () => {
    const sign = { type: 'sign', x: 1, y: 2, text: 'Hello' }
    const world = createWorld({ objects: [sign, { type: 'plant', x: 3, y: 2 }] }, { x: 1, y: 1, facing: 'down' })
    expect(world.findInteraction().object).toBe(sign)
    world.player.x = 3.5
    expect(world.findInteraction()).toEqual({})
  })
})

describe('facingFromInput', () => {
  it('keeps the current facing on diagonals that still include it', () => {
    expect(facingFromInput(1, -1, 'up')).toBe('up')
    expect(facingFromInput(1, -1, 'right')).toBe('right')
    expect(facingFromInput(-1, 1, 'left')).toBe('left')
  })

  it('picks a new facing when the current one is not being pressed', () => {
    expect(facingFromInput(1, -1, 'down')).toBe('up')
    expect(facingFromInput(0, 1, 'up')).toBe('down')
    expect(facingFromInput(-1, 0, 'right')).toBe('left')
  })
})
