import { mixColor, shade } from '../assets/pixel'

import { FACE, GROUP, POSITION_SHADED_HAIR, buildModel, type CharacterModel } from './model'
import {
  clamp,
  dot,
  makeView,
  norm,
  project,
  trace,
  type Facing,
  type HitBuffer,
  type RenderTarget,
  type Vec3,
  type View,
} from './sdf'

/** Frame size and texel density of every sheet rendered from a `CharacterModel`. */
export const MODEL_SHEET = { frameWidth: 24, frameHeight: 32, pixelsPerUnit: 21 } as const

/** RGBA pixels, row-major from the top-left. */
export interface SheetImage {
  width: number
  height: number
  data: Uint8ClampedArray
}

/** Model height in pixels, feet to crown, before the outline. */
const MODEL_PIXELS = 27
/** Empty rows under the feet, so the outline fits. */
const BOTTOM = 1
/** Degrees the camera looks down. */
const PITCH = 10
const OUTLINE = '#141018'
/** Light bands: shadow below the cut, lit above it. */
const BAND_CUT = 0.36
const BAND_TONES = [-0.38, 0.05]

const CONTRAST: Record<string, number> = { skin: 0.8, shirt: 0.7, emblem: 0.45, brim: 0.9 }
const SHADOW_TINT: Record<string, string> = { skin: '#8a3a44' }
const LIGHT_BIAS: Record<string, number> = { skin: 0.12, shirt: 0.1, emblem: 0.15 }
const HAIR_STEP: Record<string, number> = { hairLo: -1, hair: 0, hairHi: 1 }

/** Camera-space light per facing (x right, y up, z towards the viewer), always from above. */
const VIEW_LIGHT: Record<Facing, Vec3> = {
  down: [-0.55, 0.7, 0.6],
  downRight: [0.1, 0.7, 0.7],
  right: [0.3, 0.7, 0.7],
  upRight: [0.3, 0.7, 0.7],
  up: [-0.55, 0.7, 0.6],
}

/** Where two parts touch, the line goes on the one earlier in this list, so faces and hands stay clear. */
const INK_ORDER = ['shoes', 'legs', 'hair', 'top', 'cap', 'skin']
const INK_PART: Record<string, string> = {
  hairHi: 'hair',
  hairLo: 'hair',
  emblem: 'cap',
  brim: 'cap',
  shirt: 'top',
  tie: 'top',
  belt: 'top',
  apron: 'top',
}
const inkPart = (mat: string) => INK_PART[mat] ?? mat

function tone(base: string, t: number, mat: string): string {
  const k = CONTRAST[mat] ?? 1
  if (t >= 0 || !SHADOW_TINT[mat]) return shade(base, t * k)
  return mixColor(base, SHADOW_TINT[mat], -t * k * 0.85)
}

function materialColors(m: CharacterModel): Record<string, string> {
  const p = m.palette
  const cap = p.cap ?? p.top
  return {
    skin: p.skin,
    top: p.top,
    legs: p.bottom ?? p.skin,
    shoes: p.shoes,
    cap,
    brim: mixColor(cap, '#000000', 0.1),
    emblem: p.emblem ?? '#ffffff',
    shirt: p.undershirt ?? '#efe4c8',
    belt: p.belt ?? '#5e3b25',
    apron: p.apron ?? p.top,
    tie: p.tie ?? p.top,
  }
}

/** Per-pixel frame state kept after shading so later passes can find edges and the face. */
interface Frame {
  w: number
  h: number
  color: (string | null)[]
  mat: string[]
  group: Int8Array
  depth: Float32Array
  pz: Float32Array
  locked: Uint8Array
}

const N4 = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
]

const at = (f: Frame, x: number, y: number) => (x < 0 || y < 0 || x >= f.w || y >= f.h ? -1 : y * f.w + x)

function lightFor(view: View, dir: Facing): Vec3 {
  const c = norm(VIEW_LIGHT[dir])
  const v: Vec3 = [-view.d[0], -view.d[1], -view.d[2]]
  return norm([
    view.r[0] * c[0] + view.u[0] * c[1] + v[0] * c[2],
    view.r[1] * c[0] + view.u[1] * c[1] + v[1] * c[2],
    view.r[2] * c[0] + view.u[2] * c[1] + v[2] * c[2],
  ])
}

function shadeFrame(m: CharacterModel, buf: HitBuffer, light: Vec3): Frame {
  const colors = materialColors(m)
  const hair = m.palette.hair
  const hairRamp = [mixColor(hair, '#000000', 0.4), hair, mixColor(hair, '#ffd9a8', 0.22)]
  const positionHair = POSITION_SHADED_HAIR.has(m.hair)
  const n = buf.w * buf.h
  const f: Frame = {
    w: buf.w,
    h: buf.h,
    color: new Array<string | null>(n).fill(null),
    mat: buf.mat.slice(),
    group: buf.group.slice(),
    depth: buf.depth.slice(),
    pz: buf.pz.slice(),
    locked: new Uint8Array(n),
  }
  for (let i = 0; i < n; i++) {
    if (!buf.hit[i]) continue
    const mat = buf.mat[i]
    const lam = dot([buf.nx[i], buf.ny[i], buf.nz[i]], light)
    const lit = clamp((lam + 0.35) / 1.35 + (LIGHT_BIAS[mat] ?? 0), 0, 1) > BAND_CUT
    if (mat in HAIR_STEP) {
      const idx = HAIR_STEP[mat] + (positionHair ? 1 : lit ? 1 : 0)
      f.color[i] = hairRamp[clamp(idx, 0, 2)]
    } else f.color[i] = tone(colors[mat] ?? '#ff00ff', BAND_TONES[lit ? 1 : 0], mat)
  }
  return f
}

/** Drops isolated pixels and fills single-pixel holes. */
function cleanSilhouette(f: Frame): void {
  const next = f.color.slice()
  for (let y = 0; y < f.h; y++) {
    for (let x = 0; x < f.w; x++) {
      const i = y * f.w + x
      let filled = 0
      let donor = -1
      for (const [dx, dy] of N4) {
        const j = at(f, x + dx, y + dy)
        if (j >= 0 && f.color[j]) {
          filled++
          donor = j
        }
      }
      if (f.color[i] && filled === 0) next[i] = null
      if (!f.color[i] && filled === 4) {
        next[i] = f.color[donor]
        f.mat[i] = f.mat[donor]
        f.group[i] = f.group[donor]
        f.depth[i] = f.depth[donor]
        f.pz[i] = f.pz[donor]
      }
    }
  }
  f.color = next
}

/** Replaces a lone tone inside a material with the tone around it. */
function despeckle(f: Frame): void {
  const next = f.color.slice()
  for (let y = 0; y < f.h; y++) {
    for (let x = 0; x < f.w; x++) {
      const i = y * f.w + x
      if (!f.color[i]) continue
      const counts = new Map<string, number>()
      let same = 0
      for (const [dx, dy] of N4) {
        const j = at(f, x + dx, y + dy)
        if (j < 0 || f.mat[j] !== f.mat[i] || !f.color[j]) continue
        same++
        counts.set(f.color[j]!, (counts.get(f.color[j]!) ?? 0) + 1)
      }
      if (same < 3 || counts.has(f.color[i]!)) continue
      const [c, k] = [...counts].sort((a, b) => b[1] - a[1])[0]
      if (k >= 2) next[i] = c
    }
  }
  f.color = next
}

/** Black line art between parts, and between overlapping pieces of the same part. */
function innerLines(f: Frame): void {
  const next = f.color.slice()
  /* A line around the nape reads as a mouth on the back of the head. */
  const nape = (k: number) => f.mat[k] === 'skin' && (f.group[k] === GROUP.torso || f.pz[k] < 0)
  /* The face is too small to lose a row under the brim. */
  const inked = (a: string, b: string) => !((a === 'skin' && b === 'cap') || (a === 'cap' && b === 'skin'))
  for (let y = 0; y < f.h; y++) {
    for (let x = 0; x < f.w; x++) {
      const i = y * f.w + x
      if (!f.color[i]) continue
      for (const [dx, dy] of N4) {
        const j = at(f, x + dx, y + dy)
        if (j < 0 || !f.color[j]) continue
        const pi = inkPart(f.mat[i])
        const pj = inkPart(f.mat[j])
        const edge =
          pi === pj
            ? f.depth[j] < f.depth[i] - 0.02 && f.group[j] !== f.group[i]
            : inked(pi, pj) && !nape(i) && !nape(j) && INK_ORDER.indexOf(pi) < INK_ORDER.indexOf(pj)
        if (!edge) continue
        next[i] = OUTLINE
        f.locked[i] = 1
        break
      }
    }
  }
  f.color = next
}

function outline(f: Frame): void {
  const next = f.color.slice()
  for (let y = 0; y < f.h; y++) {
    for (let x = 0; x < f.w; x++) {
      const i = y * f.w + x
      if (f.color[i]) continue
      if (N4.some(([dx, dy]) => f.color[at(f, x + dx, y + dy)] ?? null)) next[i] = OUTLINE
    }
  }
  f.color = next
}

function stamp(f: Frame, rows: string[], x0: number, y0: number, colors: Record<string, string>): void {
  rows.forEach((row, dy) => {
    for (let dx = 0; dx < row.length; dx++) {
      const c = colors[row[dx]]
      const i = at(f, x0 + dx, y0 + dy)
      if (!c || i < 0 || f.mat[i] !== 'skin' || !f.color[i]) continue
      f.color[i] = c
      f.locked[i] = 1
    }
  })
}

function facePoint(u: number, v: number): Vec3 {
  const z = FACE.hr * 0.95 * Math.sqrt(Math.max(0, 1 - u * u - (v / 0.97) ** 2))
  return [u * FACE.hr, FACE.headY + v * FACE.hr, z + FACE.hr * 0.02]
}

/** Eyes are 3-pixel-tall columns and the mouth a short line, stamped onto visible skin. */
function face(m: CharacterModel, f: Frame, dir: Facing, view: View, target: RenderTarget): void {
  if (dir === 'up' || dir === 'upRight') return
  const colors: Record<string, string> = { E: '#1f1a2e', m: mixColor(m.palette.skin, '#9a3a44', 0.55) }
  const eye = ['E', 'E', 'E']
  const visible = (p: Vec3) => {
    const q = project(p, view, target)
    const i = at(f, q.x, q.y)
    return i >= 0 && f.mat[i] === 'skin' && Math.abs(f.depth[i] - q.t) < FACE.hr * 0.45 ? q : null
  }
  const place = (rows: string[], p: Vec3, symmetric: boolean, back = 0) => {
    const q = dir === 'down' ? project(p, view, target) : visible(p)
    if (!q) return
    const pw = rows[0].length
    const x0 = q.x - ((pw - 1) >> 1) - back
    const y0 = q.y - ((rows.length - 1) >> 1)
    stamp(f, rows, x0, y0, colors)
    if (symmetric) stamp(f, rows, f.w - x0 - pw, y0, colors)
  }
  const { eyeX, eyeY, mouthY } = FACE
  if (dir === 'down') {
    place(eye, facePoint(eyeX, eyeY), true)
    place(['mm'], facePoint(0.001, mouthY), false)
  } else if (dir === 'right') {
    place(eye, facePoint(-eyeX, eyeY), false, 1)
    place(eye, facePoint(eyeX, eyeY), false, 1)
    place(['m'], facePoint(-0.35, mouthY), false, 1)
  } else {
    place(eye, facePoint(-eyeX, eyeY), false)
    place(eye, facePoint(eyeX * 0.9, eyeY), false)
    place(['mm'], facePoint(0.05, mouthY), false)
  }
}

function renderFrame(m: CharacterModel, dir: Facing, pose: number): Frame {
  const target: RenderTarget = {
    w: MODEL_SHEET.frameWidth,
    h: MODEL_SHEET.frameHeight,
    scale: MODEL_PIXELS * (m.scale ?? 1),
    bottom: BOTTOM,
  }
  const view = makeView(dir, PITCH)
  const f = shadeFrame(m, trace(buildModel(m, pose), view, target), lightFor(view, dir))
  cleanSilhouette(f)
  despeckle(f)
  innerLines(f)
  face(m, f, dir, view, target)
  outline(f)
  return f
}

/** Sheet rows in `SPRITE_ROWS` order; left-facing rows mirror the right-facing renders. */
const SHEET_ROWS: { dir: Facing; mirror: boolean }[] = [
  { dir: 'down', mirror: false },
  { dir: 'right', mirror: true },
  { dir: 'right', mirror: false },
  { dir: 'up', mirror: false },
  { dir: 'downRight', mirror: true },
  { dir: 'downRight', mirror: false },
  { dir: 'upRight', mirror: true },
  { dir: 'upRight', mirror: false },
]

function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

/**
 * Renders a character model to an 8-direction walk sheet: 3 columns (stand, step A, step B) by 8 rows (down, left,
 * right, up, down-left, down-right, up-left, up-right) of `MODEL_SHEET` frames.
 * @param m - character model
 * @returns RGBA sheet
 */
export function renderCharacterSheet(m: CharacterModel): SheetImage {
  const { frameWidth: w, frameHeight: h } = MODEL_SHEET
  const width = w * 3
  const height = h * SHEET_ROWS.length
  const img: SheetImage = { width, height, data: new Uint8ClampedArray(width * height * 4) }
  const frames = new Map<string, Frame>()
  SHEET_ROWS.forEach(({ dir, mirror }, row) => {
    for (let col = 0; col < 3; col++) {
      const key = `${dir}:${col}`
      const f = frames.get(key) ?? renderFrame(m, dir, col)
      frames.set(key, f)
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const c = f.color[y * w + (mirror ? w - 1 - x : x)]
          if (!c) continue
          const o = ((row * h + y) * img.width + col * w + x) * 4
          img.data.set([...rgb(c), 255], o)
        }
      }
    }
  })
  return img
}
