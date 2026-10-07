export type Vec3 = [number, number, number]
/** Signed distance: negative inside the shape. Bounds are allowed to overestimate slightly; the marcher steps at 0.8×. */
export type Sdf = (x: number, y: number, z: number) => number

/** One solid piece of a model. `group` separates body parts for line art; `mat` names the material. */
export interface Prim {
  group: number
  sdf: Sdf
  mat: string | ((x: number, y: number, z: number) => string)
}

export const len3 = (x: number, y: number, z: number) => Math.sqrt(x * x + y * y + z * z)
export const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v)
export const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
export const norm = (a: Vec3): Vec3 => {
  const l = len3(a[0], a[1], a[2])
  return [a[0] / l, a[1] / l, a[2] / l]
}

/**
 * @param c - centre
 * @param r - radii
 */
export function ellipsoid(c: Vec3, r: Vec3): Sdf {
  const [cx, cy, cz] = c
  const [rx, ry, rz] = r
  return (x, y, z) => {
    const px = x - cx
    const py = y - cy
    const pz = z - cz
    const k0 = len3(px / rx, py / ry, pz / rz)
    const k1 = len3(px / (rx * rx), py / (ry * ry), pz / (rz * rz))
    return k1 === 0 ? -Math.min(rx, ry, rz) : (k0 * (k0 - 1)) / k1
  }
}

/**
 * Capsule whose radius varies linearly from `ra` at `a` to `rb` at `b`.
 * @param a - start
 * @param b - end
 * @param ra - radius at `a`
 * @param rb - radius at `b`
 * @param zScale - squashes depth below 1
 */
export function capsule(a: Vec3, b: Vec3, ra: number, rb = ra, zScale = 1): Sdf {
  const bax = b[0] - a[0]
  const bay = b[1] - a[1]
  const baz = (b[2] - a[2]) / zScale
  const bb = bax * bax + bay * bay + baz * baz || 1e-9
  return (x, y, z) => {
    const pax = x - a[0]
    const pay = y - a[1]
    const paz = (z - a[2]) / zScale
    const h = clamp((pax * bax + pay * bay + paz * baz) / bb, 0, 1)
    const d = len3(pax - bax * h, pay - bay * h, paz - baz * h) - (ra + (rb - ra) * h)
    return zScale < 1 ? d * zScale : d
  }
}

/**
 * @param a - segment start
 * @param b - segment end
 * @param x - point x
 * @param y - point y
 * @param z - point z
 * @returns parameter 0..1 of the closest point on the segment, used to split a limb into materials
 */
export function segmentParam(a: Vec3, b: Vec3, x: number, y: number, z: number): number {
  const ba: Vec3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]]
  return clamp(((x - a[0]) * ba[0] + (y - a[1]) * ba[1] + (z - a[2]) * ba[2]) / (dot(ba, ba) || 1e-9), 0, 1)
}

/**
 * @param c - centre
 * @param h - half-size
 * @param r - corner radius
 */
export function roundBox(c: Vec3, h: Vec3, r: number): Sdf {
  return (x, y, z) => {
    const qx = Math.abs(x - c[0]) - h[0] + r
    const qy = Math.abs(y - c[1]) - h[1] + r
    const qz = Math.abs(z - c[2]) - h[2] + r
    return len3(Math.max(qx, 0), Math.max(qy, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qy, qz), 0) - r
  }
}

export const intersect = (...s: Sdf[]): Sdf => (x, y, z) => {
  let d = -Infinity
  for (const f of s) d = Math.max(d, f(x, y, z))
  return d
}

export const smoothUnion = (a: Sdf, b: Sdf, k: number): Sdf => (x, y, z) => {
  const da = a(x, y, z)
  const db = b(x, y, z)
  const h = clamp(0.5 + (0.5 * (db - da)) / k, 0, 1)
  return db + (da - db) * h - k * h * (1 - h)
}

/** Keeps the side where `n·p > d`. */
export const above = (n: Vec3, d: number): Sdf => (x, y, z) => d - (n[0] * x + n[1] * y + n[2] * z)

/**
 * Rotates the evaluation point about the x axis around `pivot`.
 * @param s - shape to rotate
 * @param angle - radians
 * @param pivot - point on the rotation axis
 */
export function rotX(s: Sdf, angle: number, pivot: Vec3): Sdf {
  const c = Math.cos(angle)
  const si = Math.sin(angle)
  return (x, y, z) => {
    const py = y - pivot[1]
    const pz = z - pivot[2]
    return s(x, pivot[1] + py * c - pz * si, pivot[2] + py * si + pz * c)
  }
}

export interface View {
  /** Screen right, up (pitched) and view direction, in model space */
  r: Vec3
  u: Vec3
  d: Vec3
  cosPitch: number
}

/** Screen facings that get rendered; left-facing rows are mirrors of the right-facing ones. */
export type Facing = 'down' | 'downRight' | 'right' | 'upRight' | 'up'

const YAW: Record<Facing, number> = { down: 0, downRight: 45, right: 90, upRight: 135, up: 180 }

/**
 * @param facing - which way the model faces on screen
 * @param pitchDeg - how far the camera looks down
 * @returns orthographic view basis
 */
export function makeView(facing: Facing, pitchDeg: number): View {
  const p = (pitchDeg * Math.PI) / 180
  const yaw = (YAW[facing] * Math.PI) / 180
  const r: Vec3 = [Math.cos(yaw), 0, Math.sin(yaw)]
  const d: Vec3 = [Math.sin(yaw), 0, -Math.cos(yaw)]
  const c = Math.cos(p)
  const s = Math.sin(p)
  return { r, d: [d[0] * c, -s, d[2] * c], u: [d[0] * s, c, d[2] * s], cosPitch: c }
}

/** Per-pixel ray hits. */
export interface HitBuffer {
  w: number
  h: number
  hit: Uint8Array
  mat: string[]
  group: Int8Array
  depth: Float32Array
  nx: Float32Array
  ny: Float32Array
  nz: Float32Array
  /** Model-space z of the hit, positive on the front half of the body */
  pz: Float32Array
}

export interface RenderTarget {
  w: number
  h: number
  /** Pixels per model unit (a model is about 1 unit tall) */
  scale: number
  /** Empty rows below the feet */
  bottom: number
}

const FAR = 4

let hitIndex = -1
function sceneDist(prims: Prim[], x: number, y: number, z: number): number {
  let best = Infinity
  hitIndex = -1
  for (let i = 0; i < prims.length; i++) {
    const d = prims[i].sdf(x, y, z)
    if (d < best) {
      best = d
      hitIndex = i
    }
  }
  return best
}

function march(prims: Prim[], o: Vec3, dir: Vec3, maxT: number, eps: number): number {
  let t = 0
  for (let i = 0; i < 160 && t < maxT; i++) {
    const d = sceneDist(prims, o[0] + dir[0] * t, o[1] + dir[1] * t, o[2] + dir[2] * t)
    if (d < eps) return t
    t += Math.max(d * 0.8, eps * 0.5)
  }
  return -1
}

/**
 * Sphere-traces the model with one orthographic ray per pixel.
 * @param prims - model primitives
 * @param view - camera basis
 * @param target - output size and scale
 * @returns hit buffer
 */
export function trace(prims: Prim[], view: View, target: RenderTarget): HitBuffer {
  const { w, h, scale, bottom } = target
  const n = w * h
  const buf: HitBuffer = {
    w,
    h,
    hit: new Uint8Array(n),
    mat: new Array<string>(n).fill(''),
    group: new Int8Array(n),
    depth: new Float32Array(n),
    nx: new Float32Array(n),
    ny: new Float32Array(n),
    nz: new Float32Array(n),
    pz: new Float32Array(n),
  }
  const { r, u, d } = view
  const eps = 0.15 / scale
  for (let py = 0; py < h; py++) {
    for (let px = 0; px < w; px++) {
      const sx = (px + 0.5 - w / 2) / scale
      const sy = ((h - bottom - (py + 0.5)) / scale) * view.cosPitch
      const o: Vec3 = [
        r[0] * sx + u[0] * sy - d[0] * FAR,
        r[1] * sx + u[1] * sy - d[1] * FAR,
        r[2] * sx + u[2] * sy - d[2] * FAR,
      ]
      const t = march(prims, o, d, FAR * 2, eps)
      if (t < 0) continue
      const i = py * w + px
      const hx = o[0] + d[0] * t
      const hy = o[1] + d[1] * t
      const hz = o[2] + d[2] * t
      sceneDist(prims, hx, hy, hz)
      const prim = prims[hitIndex]
      buf.hit[i] = 1
      buf.group[i] = prim.group
      buf.mat[i] = typeof prim.mat === 'string' ? prim.mat : prim.mat(hx, hy, hz)
      buf.depth[i] = t
      buf.pz[i] = hz
      const e = 0.0015
      const f = prim.sdf
      const gx = f(hx + e, hy, hz) - f(hx - e, hy, hz)
      const gy = f(hx, hy + e, hz) - f(hx, hy - e, hz)
      const gz = f(hx, hy, hz + e) - f(hx, hy, hz - e)
      const gl = len3(gx, gy, gz) || 1
      buf.nx[i] = gx / gl
      buf.ny[i] = gy / gl
      buf.nz[i] = gz / gl
    }
  }
  return buf
}

/**
 * @param p - model-space point
 * @param view - camera basis
 * @param target - output size and scale
 * @returns pixel x and y (floored) and depth along the ray
 */
export function project(p: Vec3, view: View, target: RenderTarget): { x: number; y: number; t: number } {
  const sx = dot(p, view.r)
  const sy = dot(p, view.u) / view.cosPitch
  return {
    x: Math.floor(sx * target.scale + target.w / 2),
    y: Math.floor(target.h - target.bottom - sy * target.scale),
    t: dot(p, view.d) + FAR,
  }
}
