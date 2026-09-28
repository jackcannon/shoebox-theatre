import { PixelCanvas, mixColor, shade } from '../assets/pixel'
import { createRng } from '../math'

export type BuildingStyle = 'cottage' | 'lab'

export interface FacadeOptions {
  width: number
  height: number
  wall: string
  trim: string
  style: BuildingStyle
  /** Door centre in pixels from the left */
  door?: number
  /** Window centres in pixels from the left */
  windows: number[]
}

/**
 * Paints one wall of a building (siding or panels, trim, windows and door) at 16px per unit.
 * @param o - facade options
 * @returns canvas
 */
export function drawFacade(o: FacadeOptions): HTMLCanvasElement {
  const p = new PixelCanvas(o.width, o.height, false)
  const rng = createRng(o.width * 31 + o.height)
  const dark = shade(o.wall, -0.14)
  for (let y = 0; y < o.height; y++) {
    for (let x = 0; x < o.width; x++) {
      const board = o.style === 'cottage' ? y % 4 === 3 : x % 16 === 15
      const speck = rng() < 0.05
      p.set(x, y, board ? dark : speck ? shade(o.wall, -0.06) : o.wall)
    }
  }
  const trimDark = shade(o.trim, -0.3)
  p.rect(0, 0, 2, o.height, o.trim)
  p.rect(o.width - 2, 0, 2, o.height, o.trim)
  p.rect(0, 0, o.width, 2, o.trim)
  p.rect(0, 2, o.width, 1, shade(o.wall, -0.3))
  if (o.style === 'lab') p.rect(0, o.height - 7, o.width, 2, o.trim)

  const windowWidth = o.style === 'lab' ? 14 : 12
  for (const cx of o.windows) {
    const x = Math.round(cx - windowWidth / 2)
    const y = 8
    p.rect(x - 1, y - 1, windowWidth + 2, 12, trimDark)
    p.rect(x, y, windowWidth, 10, '#8fc6dc')
    p.rect(x, y, windowWidth, 3, '#b9e2ee')
    for (let i = 0; i < 4; i++) p.set(x + 2 + i, y + 6 - i, '#e4f6fb')
    p.rect(x + windowWidth / 2 - 1, y, 1, 10, o.trim)
    p.rect(x, y + 4, windowWidth, 1, o.trim)
    p.rect(x - 2, y + 10, windowWidth + 4, 2, o.trim)
    p.rect(x - 2, y + 12, windowWidth + 4, 1, shade(o.wall, -0.35))
    if (o.style === 'cottage') {
      p.rect(x - 1, y + 13, windowWidth + 2, 2, '#4f8f35')
      for (let i = 0; i < windowWidth; i += 3) p.set(x + i, y + 13, i % 2 ? '#e8483f' : '#f5cf3f')
    }
  }

  if (o.door !== undefined) {
    const doorWidth = o.style === 'lab' ? 14 : 12
    const doorHeight = 22
    const x = Math.round(o.door - doorWidth / 2)
    const y = o.height - doorHeight
    const wood = o.style === 'lab' ? '#566b83' : '#704427'
    p.rect(x - 2, y - 2, doorWidth + 4, doorHeight + 2, trimDark)
    p.rect(x - 1, y - 1, doorWidth + 2, doorHeight + 1, o.trim)
    p.rect(x, y, doorWidth, doorHeight, wood)
    for (let dx = 3; dx < doorWidth; dx += 4) p.rect(x + dx, y + 1, 1, doorHeight - 1, shade(wood, -0.25))
    p.rect(x, y, doorWidth, 1, shade(wood, 0.25))
    if (o.style === 'lab') {
      p.rect(x + 2, y + 3, doorWidth - 4, 7, '#9fd3e6')
      p.rect(x + doorWidth / 2, y + 3, 1, 7, wood)
    } else {
      p.rect(x + 3, y + 4, doorWidth - 6, 4, '#f3d38a')
    }
    p.rect(x + doorWidth - 3, y + 12, 2, 2, '#f0c35a')
  }
  return p.toCanvas()
}

/**
 * @param color - base roof colour
 * @returns 32x32 tiling shingle texture
 */
export function drawRoof(color: string): HTMLCanvasElement {
  const p = new PixelCanvas(32, 32)
  const rng = createRng(parseInt(color.slice(1), 16))
  for (let row = 0; row < 8; row++) {
    const offset = row % 2 === 0 ? 0 : 4
    for (let col = 0; col < 4; col++) {
      const tone = shade(color, (rng() - 0.5) * 0.18)
      const x0 = col * 8 + offset
      const y0 = row * 4
      p.rect(x0, y0, 8, 4, tone)
      p.rect(x0, y0, 8, 1, shade(tone, 0.2))
      p.rect(x0, y0 + 3, 8, 1, shade(tone, -0.35))
      p.rect(x0 + 7, y0, 1, 3, shade(tone, -0.2))
    }
  }
  return p.toCanvas()
}

export function drawBricks(color: string): HTMLCanvasElement {
  const p = new PixelCanvas(16, 16)
  p.fill(shade(color, -0.35))
  for (let row = 0; row < 4; row++) {
    const offset = row % 2 === 0 ? 0 : 4
    for (let col = 0; col < 2; col++) {
      const x = col * 8 + offset
      p.rect(x, row * 4, 7, 3, color)
      p.rect(x, row * 4, 7, 1, shade(color, 0.15))
    }
  }
  return p.toCanvas()
}

const BOOK_COLOURS = ['#b8433a', '#3d6fb0', '#e0b24a', '#4f8f45', '#7a4f9a', '#d98a3a', '#e8e0cc', '#2f4f6f']

export function drawBookshelf(width: number, height: number, seed: number): HTMLCanvasElement {
  const p = new PixelCanvas(width, height, false)
  const rng = createRng(seed)
  const wood = '#7a4b2a'
  p.fill(wood)
  const shelves = 4
  const inner = height - 4
  const shelfHeight = Math.floor(inner / shelves)
  for (let s = 0; s < shelves; s++) {
    const top = 2 + s * shelfHeight
    p.rect(2, top, width - 4, shelfHeight - 2, '#3b2416')
    let x = 2
    while (x < width - 3) {
      const bookWidth = 1 + Math.floor(rng() * 2)
      const bookHeight = shelfHeight - 3 - Math.floor(rng() * 3)
      if (rng() < 0.12) {
        x += 2
        continue
      }
      const colour = BOOK_COLOURS[Math.floor(rng() * BOOK_COLOURS.length)]
      p.rect(x, top + shelfHeight - 2 - bookHeight, bookWidth, bookHeight, colour)
      p.set(x, top + shelfHeight - 2 - bookHeight, shade(colour, 0.3))
      x += bookWidth
    }
    p.rect(1, top + shelfHeight - 2, width - 2, 2, shade(wood, 0.15))
  }
  p.rect(0, 0, 1, height, shade(wood, -0.3))
  p.rect(width - 1, 0, 1, height, shade(wood, -0.3))
  return p.toCanvas()
}

export function drawCabinets(width: number, height: number, colour: string): HTMLCanvasElement {
  const p = new PixelCanvas(width, height, false)
  p.fill(colour)
  const doors = Math.max(1, Math.round(width / 8))
  const doorWidth = width / doors
  for (let i = 0; i < doors; i++) {
    const x = Math.round(i * doorWidth)
    p.rect(x + 1, 2, Math.round(doorWidth) - 2, height - 3, shade(colour, 0.12))
    p.rect(x + 1, height - 2, Math.round(doorWidth) - 2, 1, shade(colour, -0.3))
    p.rect(x + Math.round(doorWidth / 2) - 1, 4, 2, 1, '#e8d08a')
  }
  p.rect(0, 0, width, 1, shade(colour, -0.25))
  return p.toCanvas()
}

/** Pixel "programme" for TV and monitor screens (also used as the emissive map). */
export function drawScreen(kind: 'tv' | 'pc'): HTMLCanvasElement {
  const p = new PixelCanvas(16, 12, false)
  if (kind === 'tv') {
    p.fill('#6fc3ec')
    p.rect(0, 8, 16, 4, '#5aa83e')
    p.rect(3, 4, 4, 5, '#f4e3c0')
    p.rect(3, 3, 4, 2, '#e8483f')
    p.rect(10, 2, 3, 3, '#fff2a8')
  } else {
    p.fill('#2b4f9e')
    p.rect(0, 0, 16, 2, '#6c8fd8')
    for (let y = 4; y < 11; y += 2) p.rect(2, y, 6 + ((y * 5) % 7), 1, '#d8e6ff')
  }
  return p.toCanvas()
}

export function drawRug(width: number, height: number, colour: string): HTMLCanvasElement {
  const p = new PixelCanvas(width, height, false)
  p.fill(colour)
  const light = shade(colour, 0.35)
  const dark = shade(colour, -0.3)
  p.rect(0, 0, width, height, dark)
  p.rect(2, 2, width - 4, height - 4, colour)
  p.rect(4, 4, width - 8, 1, light)
  p.rect(4, height - 5, width - 8, 1, light)
  p.rect(4, 4, 1, height - 8, light)
  p.rect(width - 5, 4, 1, height - 8, light)
  const cx = width / 2
  const cy = height / 2
  for (let y = 6; y < height - 6; y++) {
    for (let x = 6; x < width - 6; x++) {
      const diamond = Math.abs(x + 0.5 - cx) / (width / 2 - 6) + Math.abs(y + 0.5 - cy) / (height / 2 - 6)
      if (diamond < 0.55) p.set(x, y, diamond < 0.3 ? light : mixColor(colour, light, 0.5))
      else if ((x + y) % 6 === 0) p.set(x, y, dark)
    }
  }
  for (let x = 0; x < width; x += 2) {
    p.set(x, 0, '#efe6d0')
    p.set(x, height - 1, '#efe6d0')
  }
  return p.toCanvas()
}

export function drawQuilt(colour: string): HTMLCanvasElement {
  const p = new PixelCanvas(16, 16)
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const check = (Math.floor(x / 4) + Math.floor(y / 4)) % 2 === 0
      p.set(x, y, check ? colour : shade(colour, 0.25))
    }
  }
  for (let i = 0; i < 16; i += 4) {
    p.rect(i, 0, 1, 16, shade(colour, -0.2))
    p.rect(0, i, 16, 1, shade(colour, -0.2))
  }
  return p.toCanvas()
}

export function drawMachinePanel(width: number, height: number, seed: number, emissive: boolean): HTMLCanvasElement {
  const p = new PixelCanvas(width, height, false)
  const rng = createRng(seed)
  if (!emissive) {
    p.fill('#8e9aa3')
    p.rect(1, 1, width - 2, height - 2, '#a9b4bb')
    p.rect(3, 3, width - 6, 8, '#2a3a44')
    for (let x = 4; x < width - 4; x++) p.set(x, 7 + Math.round(Math.sin(x * 0.9) * 2), '#6fe0a0')
    for (let i = 0; i < 3; i++) {
      p.rect(4 + i * 5, 14, 3, 3, '#5a646b')
      p.set(5 + i * 5, 15, '#dfe6ea')
    }
  } else {
    p.fill('#000000')
    p.rect(3, 3, width - 6, 8, '#0c1a14')
    for (let x = 4; x < width - 4; x++) p.set(x, 7 + Math.round(Math.sin(x * 0.9) * 2), '#6fe0a0')
  }
  for (let y = 20; y < height - 3; y += 4) {
    for (let x = 4; x < width - 4; x += 4) {
      const lit = rng() < 0.5
      const colour = ['#ff5a4a', '#ffd44a', '#5affa0', '#5ac8ff'][Math.floor(rng() * 4)]
      p.rect(x, y, 2, 2, emissive ? (lit ? colour : '#000000') : lit ? colour : '#5a646b')
    }
  }
  return p.toCanvas()
}

export function drawPainting(): HTMLCanvasElement {
  const p = new PixelCanvas(16, 12, false)
  p.fill('#f3b27a')
  p.rect(0, 0, 16, 3, '#e98a6a')
  p.rect(10, 3, 3, 3, '#fff0b0')
  p.rect(0, 6, 16, 6, '#3f7fa8')
  p.rect(0, 6, 16, 1, '#ffd8a0')
  p.rect(0, 9, 16, 1, '#5f9fc0')
  p.rect(2, 4, 4, 3, '#4f7f45')
  return p.toCanvas()
}

export function drawStripes(colour: string): HTMLCanvasElement {
  const p = new PixelCanvas(16, 10, false)
  p.fill(colour)
  for (let y = 1; y < 10; y += 3) p.rect(1, y, 14, 1, shade(colour, 0.3))
  p.rect(0, 0, 16, 1, shade(colour, -0.3))
  p.rect(0, 9, 16, 1, shade(colour, -0.3))
  return p.toCanvas()
}

export function drawSignBoard(): HTMLCanvasElement {
  const p = new PixelCanvas(16, 10, false)
  p.fill('#9a6a3e')
  p.rect(0, 0, 16, 1, '#c08a55')
  p.rect(0, 9, 16, 1, '#5b3d25')
  for (let y = 3; y < 8; y += 2) p.rect(3, y, 8 + (y % 3) * 2, 1, '#5b3d25')
  return p.toCanvas()
}
