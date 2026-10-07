import { createRng, type Rng } from '../math'

import type { TextureSource } from './AssetManager'
import { PixelCanvas, mixColor, noiseFill, tileableNoise } from './pixel'

function paint(width: number, height: number, draw: (p: PixelCanvas, rng: Rng) => void, seed: number, wrap = true) {
  return () => {
    const p = new PixelCanvas(width, height, wrap)
    draw(p, createRng(seed))
    return p.toCanvas()
  }
}

function scatter(p: PixelCanvas, rng: Rng, count: number, draw: (x: number, y: number) => void): void {
  for (let i = 0; i < count; i++) draw(Math.floor(rng() * p.width), Math.floor(rng() * p.height))
}

const grass = paint(64, 64, (p, rng) => {
  noiseFill(p, ['#3d7a2d', '#468933', '#51963a', '#5da442', '#6cb24a'], rng, 16, 0.35, 1.9)
  scatter(p, rng, 110, (x, y) => {
    const flip = rng() < 0.5 ? 1 : -1
    p.set(x, y, '#326626')
    p.set(x + flip, y - 1, '#326626')
    p.set(x - flip, y - 1, '#3d7a2d')
    p.set(x + flip * 2, y - 2, rng() < 0.5 ? '#86c65a' : '#6cb24a')
  })
  scatter(p, rng, 10, (x, y) => {
    p.set(x, y, rng() < 0.5 ? '#f6f1c9' : '#f2d65c')
    p.set(x, y + 1, '#3d7a2d')
  })
}, 11)

const path = paint(64, 64, (p, rng) => {
  noiseFill(p, ['#9c7848', '#aa8654', '#b8945f', '#c4a16b'], rng, 16, 0.3, 1.6)
  scatter(p, rng, 46, (x, y) => {
    p.set(x, y, '#dac18f')
    p.set(x + 1, y, '#cfb281')
    p.set(x, y + 1, '#86653c')
    p.set(x + 1, y + 1, '#86653c')
  })
  scatter(p, rng, 30, (x, y) => p.set(x, y, '#8e6b3e'))
}, 23)

const sand = paint(64, 64, (p, rng) => {
  noiseFill(p, ['#cfb67c', '#d9c38a', '#e2cf97', '#ebdba6'], rng, 16, 0.3, 1.5)
  scatter(p, rng, 50, (x, y) => p.set(x, y, rng() < 0.6 ? '#f5ecc8' : '#b39a66'))
}, 31)

const seabed = paint(64, 64, (p, rng) => {
  noiseFill(p, ['#2b5f68', '#336d72', '#3d7b7b', '#478884'], rng, 16, 0.3, 1.6)
  scatter(p, rng, 30, (x, y) => p.set(x, y, '#5c9690'))
}, 37)

/** Earth bank under a grass lip, for the sides of raised grass (e.g. at the water's edge). */
const bank = paint(16, 32, (p, rng) => {
  noiseFill(p, ['#553a26', '#63452d', '#715035', '#7d5a3c'], rng, 8, 0.3, 1.5)
  for (let x = 0; x < 16; x++) {
    p.set(x, 0, '#6cb24a')
    p.set(x, 1, '#51963a')
    const drip = 2 + Math.floor(rng() * 3)
    for (let y = 2; y < drip; y++) p.set(x, y, '#3d7a2d')
  }
  scatter(p, rng, 10, (x, y) => {
    if (y < 6) return
    p.set(x, y, '#8d857a')
    p.set(x + 1, y, '#7a7268')
  })
}, 41, false)

const cliff = paint(16, 32, (p, rng) => {
  noiseFill(p, ['#5b5751', '#6a665f', '#79746c', '#88827a'], rng, 8, 0.3, 1.7)
  for (let y = 5; y < 32; y += 5 + Math.floor(rng() * 3)) {
    const start = Math.floor(rng() * 16)
    const length = 5 + Math.floor(rng() * 8)
    for (let x = start; x < start + length; x++) {
      p.set(x, y, '#46423e')
      p.set(x, y - 1, '#99938a')
    }
  }
  for (let x = 0; x < 16; x++) {
    p.set(x, 0, '#6cb24a')
    p.set(x, 1, rng() < 0.7 ? '#51963a' : '#46423e')
  }
}, 43, false)

const dock = paint(16, 16, (p, rng) => {
  const planks = ['#96663b', '#a47246', '#ae7d4e', '#9c6b40']
  for (let row = 0; row < 4; row++) {
    const base = planks[row]
    for (let y = row * 4; y < row * 4 + 4; y++) {
      for (let x = 0; x < 16; x++) {
        const grain = rng() < 0.15 ? mixColor(base, '#5b3d25', 0.3) : base
        p.set(x, y, y === row * 4 + 3 ? '#5b3d25' : y === row * 4 ? mixColor(base, '#f0c890', 0.2) : grain)
      }
    }
    p.set(2, row * 4 + 1, '#3a2a1a')
    p.set(13, row * 4 + 1, '#3a2a1a')
  }
}, 47)

const dockSide = paint(16, 16, (p, rng) => {
  noiseFill(p, ['#3f2a1a', '#4a3220', '#553a26'], rng, 4, 0.2, 1.2)
  p.rect(0, 0, 16, 2, '#6b4a2e')
  p.rect(0, 2, 16, 1, '#2e1f14')
  p.rect(1, 3, 3, 13, '#5c3f28')
  p.rect(12, 3, 3, 13, '#5c3f28')
}, 53, false)

const woodFloor = paint(32, 32, (p, rng) => {
  const tones = ['#8e5d35', '#9b6a3f', '#a8764a', '#b38252']
  for (let row = 0; row < 8; row++) {
    let x = Math.floor(rng() * 12)
    while (x < 32 + 12) {
      const length = 10 + Math.floor(rng() * 12)
      const tone = tones[Math.floor(rng() * tones.length)]
      for (let i = 0; i < length; i++) {
        for (let y = row * 4; y < row * 4 + 4; y++) {
          const edge = y === row * 4 + 3
          const grain = !edge && rng() < 0.12 ? mixColor(tone, '#5a3820', 0.35) : tone
          p.set(x + i, y, edge ? '#6a4326' : y === row * 4 ? mixColor(tone, '#f3c68e', 0.18) : grain)
        }
      }
      for (let y = row * 4; y < row * 4 + 3; y++) p.set(x, y, '#6a4326')
      x += length
    }
  }
}, 59)

const tileFloor = paint(32, 32, (p) => {
  for (let ty = 0; ty < 4; ty++) {
    for (let tx = 0; tx < 4; tx++) {
      const base = (tx + ty) % 2 === 0 ? '#e9e6dd' : '#dad5c8'
      p.rect(tx * 8, ty * 8, 8, 8, base)
      p.rect(tx * 8, ty * 8, 7, 1, mixColor(base, '#ffffff', 0.5))
      p.rect(tx * 8 + 7, ty * 8, 1, 8, '#b3ad9f')
      p.rect(tx * 8, ty * 8 + 7, 8, 1, '#b3ad9f')
    }
  }
}, 61)

function wallpaperTexture(base: string, stripe: string, dot: string, panel: string) {
  return paint(16, 40, (p) => {
    p.fill(base)
    for (let y = 2; y < 27; y++) {
      p.set(0, y, stripe)
      p.set(1, y, stripe)
      p.set(8, y, stripe)
      p.set(9, y, stripe)
      if (y % 8 === 4) {
        p.set(4, y, dot)
        p.set(12, y, dot)
      }
    }
    p.rect(0, 0, 16, 1, mixColor(panel, '#000000', 0.2))
    p.rect(0, 1, 16, 1, mixColor(panel, '#ffffff', 0.15))
    p.rect(0, 27, 16, 1, mixColor(panel, '#000000', 0.25))
    p.rect(0, 28, 16, 1, mixColor(panel, '#ffffff', 0.2))
    p.rect(0, 29, 16, 11, panel)
    p.rect(1, 30, 14, 1, mixColor(panel, '#ffffff', 0.18))
    p.rect(1, 37, 14, 1, mixColor(panel, '#000000', 0.25))
    p.rect(0, 29, 1, 10, mixColor(panel, '#000000', 0.2))
    p.rect(0, 39, 16, 1, mixColor(panel, '#000000', 0.45))
  }, 67, false)
}

const labWall = paint(16, 40, (p) => {
  p.fill('#e7ebe9')
  p.rect(0, 0, 16, 1, '#b9c1bf')
  p.rect(15, 0, 1, 24, '#d3d9d7')
  p.rect(0, 24, 16, 2, '#5f8fbf')
  p.rect(0, 26, 16, 1, '#3f6d9c')
  p.rect(0, 27, 16, 12, '#cdd4d3')
  p.rect(0, 27, 1, 12, '#b2bab9')
  p.rect(0, 39, 16, 1, '#7f8888')
}, 71, false)

const wallTop = paint(16, 16, (p, rng) => {
  noiseFill(p, ['#30231f', '#3a2b26', '#44332d'], rng, 4, 0.2, 1.2)
}, 73)

const stone = paint(32, 32, (p, rng) => {
  p.fill('#5d5953')
  for (let row = 0; row < 4; row++) {
    const offset = row % 2 === 0 ? 0 : 4
    for (let col = 0; col < 4; col++) {
      const x = col * 8 + offset
      const y = row * 8
      const tone = ['#8b857d', '#978f86', '#a39b90', '#827c74'][Math.floor(rng() * 4)]
      p.rect(x + 1, y + 1, 6, 6, tone)
      p.rect(x + 1, y + 1, 6, 1, mixColor(tone, '#ffffff', 0.25))
      p.rect(x + 6, y + 2, 1, 5, mixColor(tone, '#000000', 0.2))
    }
  }
}, 79)

const leaves = paint(32, 32, (p, rng) => {
  noiseFill(p, ['#2a5c26', '#336c2c', '#3d7d33', '#4a8e3a', '#58a043'], rng, 8, 0.35, 2)
  scatter(p, rng, 14, (x, y) => {
    p.set(x, y, '#78bb56')
    p.set(x + 1, y, '#6aad4c')
    p.set(x, y + 1, '#6aad4c')
  })
}, 83)

const bark = paint(16, 16, (p, rng) => {
  const n = tileableNoise(16, 16, 4, rng)
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const v = n[x] * 0.7 + n[y * 16 + x] * 0.3
      p.set(x, y, v < 0.4 ? '#4b3120' : v < 0.55 ? '#5a3c27' : '#6b4a31')
    }
  }
}, 89)

/** Two 16x10 frames of a flower cluster, swaying. */
const flowers = paint(32, 10, (p) => {
  const heads: [number, number, string, string][] = [
    [3, 2, '#e8483f', '#f7d74a'],
    [11, 1, '#f4f1ea', '#f2b53a'],
    [7, 4, '#f5cf3f', '#e0663a'],
  ]
  for (let frame = 0; frame < 2; frame++) {
    const ox = frame * 16
    for (const [hx, hy, petal, centre] of heads) {
      const sway = frame === 1 ? 1 : 0
      for (let y = hy + 2; y < 10; y++) p.set(ox + hx + (y < hy + 4 ? sway : 0), y, '#3f8a34')
      p.set(ox + hx - 1, 8, '#56a043')
      p.set(ox + hx + 1, 7, '#56a043')
      const x = ox + hx + sway
      p.set(x - 1, hy, petal)
      p.set(x + 1, hy, petal)
      p.set(x, hy - 1, petal)
      p.set(x, hy + 1, petal)
      p.set(x, hy, centre)
    }
  }
}, 97, false)

const tallGrass = paint(16, 16, (p, rng) => {
  for (let x = 0; x < 16; x++) {
    if (rng() < 0.25) continue
    const height = 6 + Math.floor(rng() * 9)
    const lean = rng() < 0.5 ? -1 : 1
    for (let i = 0; i < height; i++) {
      const y = 15 - i
      const t = i / height
      const color = t > 0.8 ? '#86c65a' : t > 0.5 ? '#5da442' : t > 0.25 ? '#468933' : '#326626'
      p.set(x + (i > height * 0.7 ? lean : 0), y, color)
    }
  }
}, 101, false)

function radial(size: number, alpha: (d: number) => number, color: string) {
  return () => {
    const p = new PixelCanvas(size, size, false)
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const d = Math.hypot(x + 0.5 - size / 2, y + 0.5 - size / 2) / (size / 2)
        if (d < 1) p.set(x, y, color, Math.round(alpha(d) * 255))
      }
    }
    return p.toCanvas()
  }
}

const lightShaft = () => {
  const p = new PixelCanvas(16, 64, false)
  for (let y = 0; y < 64; y++) {
    for (let x = 0; x < 16; x++) {
      const across = Math.sin(((x + 0.5) / 16) * Math.PI) ** 1.5
      p.set(x, y, '#fff2cf', Math.round((1 - y / 64) ** 1.3 * across * 255))
    }
  }
  return p.toCanvas()
}

/** Every texture the engine's built-in surfaces, decorations and prefabs rely on. */
export const BUILTIN_TEXTURES: Record<string, TextureSource> = {
  grass: { draw: grass },
  path: { draw: path },
  sand: { draw: sand },
  seabed: { draw: seabed },
  bank: { draw: bank },
  cliff: { draw: cliff },
  dock: { draw: dock },
  dockSide: { draw: dockSide },
  woodFloor: { draw: woodFloor },
  tileFloor: { draw: tileFloor },
  wallpaper: { draw: wallpaperTexture('#ead7b0', '#dfc69a', '#caa978', '#8a5a36') },
  wallpaperBlue: { draw: wallpaperTexture('#d3e0e2', '#bfd0d5', '#a2b9c1', '#6d5a48') },
  labWall: { draw: labWall },
  wallTop: { draw: wallTop },
  stone: { draw: stone },
  leaves: { draw: leaves },
  bark: { draw: bark },
  flowers: { draw: flowers, mipmaps: false },
  tallGrass: { draw: tallGrass, mipmaps: false },
  blob: { draw: radial(32, (d) => (1 - d) ** 1.4 * 0.6, '#000000'), pixelArt: false, mipmaps: false },
  dot: { draw: radial(32, (d) => (1 - d) ** 2, '#ffffff'), pixelArt: false, mipmaps: false },
  lightShaft: { draw: lightShaft, pixelArt: false, mipmaps: false },
}
