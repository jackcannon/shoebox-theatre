import type { Rng } from '../math'

/** Texel density shared by every texture, so pixel art stays the same size on every surface. */
export const PIXELS_PER_UNIT = 16

type Rgb = [number, number, number]

const rgbCache = new Map<string, Rgb>()

function toRgb(hex: string): Rgb {
  let rgb = rgbCache.get(hex)
  if (!rgb) {
    const n = parseInt(hex.slice(1), 16)
    rgb = [(n >> 16) & 255, (n >> 8) & 255, n & 255]
    rgbCache.set(hex, rgb)
  }
  return rgb
}

function toHex([r, g, b]: Rgb): string {
  const c = (v: number) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')
  return `#${c(r)}${c(g)}${c(b)}`
}

export function mixColor(a: string, b: string, t: number): string {
  const [ar, ag, ab] = toRgb(a)
  const [br, bg, bb] = toRgb(b)
  return toHex([ar + (br - ar) * t, ag + (bg - ag) * t, ab + (bb - ab) * t])
}

/**
 * Pixel-art style shading: shadows shift towards cool purple, highlights towards warm white.
 * @param hex - base colour
 * @param amount - negative darkens, positive lightens (-1..1)
 * @returns shaded colour
 */
export function shade(hex: string, amount: number): string {
  return amount < 0 ? mixColor(hex, '#1e1630', -amount) : mixColor(hex, '#fff4da', amount)
}

/** Minimal RGBA pixel buffer with optional wrap-around so textures tile seamlessly. */
export class PixelCanvas {
  readonly width: number
  readonly height: number
  readonly wrap: boolean
  private readonly data: Uint8ClampedArray

  constructor(width: number, height: number, wrap = true) {
    this.width = width
    this.height = height
    this.wrap = wrap
    this.data = new Uint8ClampedArray(width * height * 4)
  }

  set(x: number, y: number, color: string, alpha = 255): void {
    let px = Math.floor(x)
    let py = Math.floor(y)
    if (this.wrap) {
      px = ((px % this.width) + this.width) % this.width
      py = ((py % this.height) + this.height) % this.height
    } else if (px < 0 || py < 0 || px >= this.width || py >= this.height) return
    const [r, g, b] = toRgb(color)
    const i = (py * this.width + px) * 4
    this.data[i] = r
    this.data[i + 1] = g
    this.data[i + 2] = b
    this.data[i + 3] = alpha
  }

  rect(x: number, y: number, w: number, h: number, color: string, alpha = 255): void {
    for (let py = y; py < y + h; py++) for (let px = x; px < x + w; px++) this.set(px, py, color, alpha)
  }

  fill(color: string, alpha = 255): void {
    this.rect(0, 0, this.width, this.height, color, alpha)
  }

  /**
   * Draws a pixel grid where each character maps to a colour; `.` and unmapped characters are skipped.
   * @param rows - grid rows
   * @param colors - character to colour map
   * @param ox - x offset
   * @param oy - y offset
   * @param mirror - flip horizontally within the grid width
   */
  pattern(rows: string[], colors: Record<string, string>, ox = 0, oy = 0, mirror = false): void {
    rows.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        const color = colors[row[x]]
        if (!color) continue
        this.set(ox + (mirror ? row.length - 1 - x : x), oy + y, color)
      }
    })
  }

  toCanvas(): HTMLCanvasElement {
    const canvas = document.createElement('canvas')
    canvas.width = this.width
    canvas.height = this.height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('2D canvas is not supported')
    ctx.putImageData(new ImageData(new Uint8ClampedArray(this.data), this.width, this.height), 0, 0)
    return canvas
  }
}

/**
 * Tileable value noise with a few octaves.
 * @param width - texture width (should be a multiple of `cell`)
 * @param height - texture height (should be a multiple of `cell`)
 * @param cell - size of the coarsest octave in pixels
 * @param rng - random source
 * @param octaves - number of octaves
 * @returns values in [0, 1], row-major
 */
export function tileableNoise(width: number, height: number, cell: number, rng: Rng, octaves = 2): Float32Array {
  const out = new Float32Array(width * height)
  let amplitude = 1
  let total = 0
  for (let o = 0; o < octaves; o++) {
    const size = Math.max(1, cell >> o)
    const gw = Math.max(1, Math.round(width / size))
    const gh = Math.max(1, Math.round(height / size))
    const lattice = Array.from({ length: gw * gh }, () => rng())
    const at = (i: number, j: number) => lattice[(j % gh) * gw + (i % gw)]
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const gx = (x / width) * gw
        const gy = (y / height) * gh
        const x0 = Math.floor(gx)
        const y0 = Math.floor(gy)
        const fx = smooth(gx - x0)
        const fy = smooth(gy - y0)
        const top = at(x0, y0) + (at(x0 + 1, y0) - at(x0, y0)) * fx
        const bottom = at(x0, y0 + 1) + (at(x0 + 1, y0 + 1) - at(x0, y0 + 1)) * fx
        out[y * width + x] += (top + (bottom - top) * fy) * amplitude
      }
    }
    total += amplitude
    amplitude *= 0.5
  }
  for (let i = 0; i < out.length; i++) out[i] /= total
  return out
}

function smooth(t: number): number {
  return t * t * (3 - 2 * t)
}

const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16 - 0.5)

/**
 * Quantises a value to a palette with ordered dithering, the classic pixel-art gradient look.
 * @param colors - palette from dark to light
 * @param value - value in [0, 1]
 * @param x - pixel x
 * @param y - pixel y
 * @param spread - dither strength
 * @returns palette colour
 */
export function ditherPick(colors: string[], value: number, x: number, y: number, spread = 0.15): string {
  const v = value + BAYER4[(y & 3) * 4 + (x & 3)] * spread
  const i = Math.floor(Math.min(0.999, Math.max(0, v)) * colors.length)
  return colors[i]
}

/**
 * Fills a canvas with dithered noise over a palette.
 * @param p - target canvas
 * @param colors - palette from dark to light
 * @param rng - random source
 * @param cell - noise cell size in pixels
 * @param spread - dither strength
 * @param contrast - stretches the noise around 0.5
 */
export function noiseFill(p: PixelCanvas, colors: string[], rng: Rng, cell = 8, spread = 0.2, contrast = 1.6): void {
  const n = tileableNoise(p.width, p.height, cell, rng)
  for (let y = 0; y < p.height; y++) {
    for (let x = 0; x < p.width; x++) {
      const v = (n[y * p.width + x] - 0.5) * contrast + 0.5
      p.set(x, y, ditherPick(colors, v, x, y, spread))
    }
  }
}
