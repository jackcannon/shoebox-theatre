import { describe, expect, it } from 'vitest'
import type { TileType } from '../types'
import { TileMap } from './TileMap'

const wall: TileType = { ground: 'stone', height: 2, solid: true }
const floor: TileType = { ground: 'grass' }
const palette = { '#': wall, '.': floor }

describe('TileMap', () => {
  it('parses the layout and reports its dimensions', () => {
    const map = new TileMap({ id: 'test', tiles: ['#..', '...'], palette, border: 4 })
    expect(map.width).toBe(3)
    expect(map.height).toBe(2)
    expect(map.border).toBe(4)
    expect(map.get(0, 0)).toBe(wall)
    expect(map.get(2, 1)).toBe(floor)
    expect(map.heightAt(0.5, 0.5)).toBe(2)
    expect(map.heightAt(1.5, 0.5)).toBe(0)
  })

  it('throws on uneven rows', () => {
    expect(() => new TileMap({ id: 'test', tiles: ['...', '..'], palette })).toThrow(/row 1 has 2 tiles, expected 3/)
  })

  it('throws on unknown characters', () => {
    expect(() => new TileMap({ id: 'test', tiles: ['..x'], palette })).toThrow(/unknown tile "x" at 2,0/)
  })

  it('extends edge tiles outwards with getClamped', () => {
    const map = new TileMap({ id: 'test', tiles: ['#..', '...'], palette })
    expect(map.getClamped(-5, -5)).toBe(wall)
    expect(map.getClamped(0, 9)).toBe(floor)
    expect(map.getClamped(-3, 0)).toBe(wall)
    expect(map.getClamped(9, 9)).toBe(floor)
    expect(map.heightAt(-2, -2)).toBe(2)
  })

  it('treats out-of-bounds tiles as solid', () => {
    const map = new TileMap({ id: 'test', tiles: ['#..', '...'], palette })
    expect(map.get(-1, 0)).toBeUndefined()
    expect(map.isSolid(-1, 0)).toBe(true)
    expect(map.isSolid(3, 0)).toBe(true)
    expect(map.isSolid(0, 2)).toBe(true)
    expect(map.isSolid(0, 0)).toBe(true)
    expect(map.isSolid(1, 1)).toBe(false)
  })
})
