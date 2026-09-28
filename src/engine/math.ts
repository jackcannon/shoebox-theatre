import type { Direction } from './types'

export const DIRECTION_VECTORS: Record<Direction, [number, number]> = {
  up: [0, -1],
  down: [0, 1],
  left: [-1, 0],
  right: [1, 0],
}

export const OPPOSITE_DIRECTION: Record<Direction, Direction> = {
  up: 'down',
  down: 'up',
  left: 'right',
  right: 'left',
}

export const ALL_DIRECTIONS: Direction[] = ['down', 'left', 'right', 'up']

/**
 * Picks the cardinal direction closest to a vector (x = east, z = south).
 * @param dx - x component
 * @param dz - z component
 * @returns closest cardinal direction
 */
export function directionFromVector(dx: number, dz: number): Direction {
  if (Math.abs(dx) > Math.abs(dz)) return dx > 0 ? 'right' : 'left'
  return dz > 0 ? 'down' : 'up'
}

export type Rng = () => number

/**
 * Deterministic PRNG (mulberry32) so procedural assets look the same on every load.
 * @param seed - any integer
 * @returns function returning values in [0, 1)
 */
export function createRng(seed: number): Rng {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Stable hash of a tile coordinate.
 * @param x - tile x
 * @param z - tile z
 * @param salt - varies the result for different uses of the same tile
 * @returns value in [0, 1)
 */
export function hashTile(x: number, z: number, salt = 0): number {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(z | 0, 668265263) ^ Math.imul(salt | 0, 1442695041)
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

/**
 * Frame-rate independent exponential smoothing.
 * @param current - current value
 * @param target - value to approach
 * @param lambda - higher is snappier
 * @param dt - frame delta in seconds
 * @returns smoothed value
 */
export function damp(current: number, target: number, lambda: number, dt: number): number {
  return target + (current - target) * Math.exp(-lambda * dt)
}

/**
 * @param ms - duration in milliseconds
 */
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
