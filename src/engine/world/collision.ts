const EPS = 1e-4

export interface Box {
  minX: number
  minZ: number
  maxX: number
  maxZ: number
}

export type SolidQuery = (tileX: number, tileZ: number) => boolean

export interface MoveResult {
  x: number
  z: number
  blockedX: boolean
  blockedZ: boolean
}

type Span = [min: number, max: number, crossMin: number, crossMax: number]

function sweep(
  pos: number,
  cross: number,
  r: number,
  delta: number,
  solidAt: (main: number, cross: number) => boolean,
  spans: Span[],
): [number, boolean] {
  if (delta === 0) return [pos, false]
  let next = pos + delta
  let blocked = false
  const c0 = Math.floor(cross - r + EPS)
  const c1 = Math.floor(cross + r - EPS)
  const anySolid = (t: number) => {
    for (let c = c0; c <= c1; c++) if (solidAt(t, c)) return true
    return false
  }

  if (delta > 0) {
    const from = Math.floor(pos + r - EPS)
    const to = Math.floor(next + r - EPS)
    for (let t = from + 1; t <= to; t++) {
      if (anySolid(t)) {
        next = t - r
        blocked = true
        break
      }
    }
  } else {
    const from = Math.floor(pos - r + EPS)
    const to = Math.floor(next - r + EPS)
    for (let t = from - 1; t >= to; t--) {
      if (anySolid(t)) {
        next = t + 1 + r
        blocked = true
        break
      }
    }
  }

  for (const [min, max, crossMin, crossMax] of spans) {
    if (cross + r <= crossMin + EPS || cross - r >= crossMax - EPS) continue
    if (delta > 0 && pos + r <= min + EPS && next + r > min) {
      next = min - r
      blocked = true
    } else if (delta < 0 && pos - r >= max - EPS && next - r < max) {
      next = max + r
      blocked = true
    }
  }
  return [next, blocked]
}

/**
 * Moves a square of half-size `r` through a tile grid, one axis at a time so it slides along walls.
 * @param x - current centre x
 * @param z - current centre z
 * @param r - half-size of the collision box
 * @param dx - desired x movement
 * @param dz - desired z movement
 * @param isSolid - tile solidity query
 * @param boxes - dynamic obstacles (other characters)
 * @returns resolved position and which axes were blocked
 */
export function moveBox(
  x: number,
  z: number,
  r: number,
  dx: number,
  dz: number,
  isSolid: SolidQuery,
  boxes: Box[] = [],
): MoveResult {
  const [nx, blockedX] = sweep(
    x,
    z,
    r,
    dx,
    (t, c) => isSolid(t, c),
    boxes.map((b) => [b.minX, b.maxX, b.minZ, b.maxZ]),
  )
  const [nz, blockedZ] = sweep(
    z,
    nx,
    r,
    dz,
    (t, c) => isSolid(c, t),
    boxes.map((b) => [b.minZ, b.maxZ, b.minX, b.maxX]),
  )
  return { x: nx, z: nz, blockedX, blockedZ }
}

/**
 * @param x - centre x
 * @param z - centre z
 * @param half - half-size
 * @returns box around a point
 */
export function boxAround(x: number, z: number, half: number): Box {
  return { minX: x - half, minZ: z - half, maxX: x + half, maxZ: z + half }
}
