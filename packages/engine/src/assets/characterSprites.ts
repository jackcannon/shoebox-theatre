import type { SpriteSheetDefinition } from './AssetManager'
import { PixelCanvas, shade } from './pixel'

/*
 * Characters are composed from 16x24 pixel-grid parts, then recoloured with a palette.
 * Keys: o outline, H/h hair, S/s skin, E eyes, W white, C/c top, A/a accent (hat, belt, apron),
 * P/p legs, B shoes. Lowercase is the auto-derived shadow tone. `.` is transparent.
 * Only down/up/right are drawn; left is mirrored from right.
 */

export const FRAME_WIDTH = 16
export const FRAME_HEIGHT = 24

type PartDirection = 'down' | 'up' | 'right'
interface Part {
  y: number
  rows: string[]
}
type DirectionalPart = Record<PartDirection, Part>

export type HeadStyle = 'short' | 'cap' | 'long' | 'bun'
export type BodyStyle = 'tunic' | 'dress' | 'coat'

const HEADS: Record<HeadStyle, DirectionalPart> = {
  short: {
    down: {
      y: 2,
      rows: [
        '....oooooooo....',
        '...oHHHHHHHHo...',
        '..oHHHHHHHHHHo..',
        '..oHHHHHHHHHHo..',
        '..oHHHHHHHHHHo..',
        '..ohHHhHHhHHho..',
        '..ohSSShSSSSho..',
        '..oSSESSSSESSo..',
        '..oSSESSSSESSo..',
        '..osSSSSSSSSso..',
        '...osSSSSSSso...',
      ],
    },
    up: {
      y: 2,
      rows: [
        '....oooooooo....',
        '...oHHHHHHHHo...',
        '..oHHHHHHHHHHo..',
        '..oHHHHHHHHHHo..',
        '..oHHHHHHHHHHo..',
        '..oHHHHHHHHHHo..',
        '..ohHHHHHHHHho..',
        '..ohHHHHHHHHho..',
        '..ohhHHHHHHhho..',
        '...ohhhhhhhho...',
        '....osSSSSso....',
      ],
    },
    right: {
      y: 2,
      rows: [
        '....ooooooo.....',
        '...oHHHHHHHo....',
        '..oHHHHHHHHHo...',
        '..oHHHHHHHHHHo..',
        '..oHHHHHHHHHHo..',
        '..oHHHHHHhHhHo..',
        '..oHHHHHhSSSSo..',
        '..ohHHHSSSSESo..',
        '..ohHHsSSSSESo..',
        '..oohhsSSSSSSo..',
        '....osSSSSSso...',
      ],
    },
  },
  cap: {
    down: {
      y: 1,
      rows: [
        '....oooooooo....',
        '...oAAAAAAAAo...',
        '..oAAAAWWAAAAo..',
        '..oAAAAWWAAAAo..',
        '..oAAAAAAAAAAo..',
        '.oaaaaaaaaaaaao.',
        '..ohHHHHHHHHho..',
        '..ohSSSSSSSSho..',
        '..oSSESSSSESSo..',
        '..oSSESSSSESSo..',
        '..osSSSSSSSSso..',
        '...osSSSSSSso...',
      ],
    },
    up: {
      y: 1,
      rows: [
        '....oooooooo....',
        '...oAAAAAAAAo...',
        '..oAAAAAAAAAAo..',
        '..oAAAAAAAAAAo..',
        '..oAAAAAAAAAAo..',
        '..oaaaaWWaaaao..',
        '..oHHHHHHHHHHo..',
        '..oHHHHHHHHHHo..',
        '..ohHHHHHHHHho..',
        '..ohhHHHHHHhho..',
        '...ohhhhhhhho...',
        '....osSSSSso....',
      ],
    },
    right: {
      y: 1,
      rows: [
        '....ooooooo.....',
        '...oAAAAAAAo....',
        '..oAAAAAAAWAo...',
        '..oAAAAAAAAAAo..',
        '..oAAAAAAAAAAoo.',
        '..oaaaaaaaaaaaao',
        '..oHHHHHHhSSSo..',
        '..oHHHHHhSSSSo..',
        '..ohHHHSSSSESo..',
        '..ohHHsSSSSESo..',
        '..oohhsSSSSSSo..',
        '....osSSSSSso...',
      ],
    },
  },
  long: {
    down: {
      y: 2,
      rows: [
        '....oooooooo....',
        '...oHHHHHHHHo...',
        '..oHHHHHHHHHHo..',
        '..oHHHHHHHHHHo..',
        '..oHHHHHHHHHHo..',
        '.oHHhHHHHHHhHHo.',
        '.oHhSSSSSSSShHo.',
        '.oHSSESSSSESSHo.',
        '.oHSSESSSSESSHo.',
        '.oHsSSSSSSSSsHo.',
        '.oHHosSSSSsoHHo.',
        '.oHHo......oHHo.',
        '.oHHo......oHHo.',
        '.ohho......ohho.',
        '..oo........oo..',
      ],
    },
    up: {
      y: 2,
      rows: [
        '....oooooooo....',
        '...oHHHHHHHHo...',
        '..oHHHHHHHHHHo..',
        '..oHHHHHHHHHHo..',
        '..oHHHHHHHHHHo..',
        '.oHHHHHHHHHHHHo.',
        '.oHHHHHHHHHHHHo.',
        '.oHHHHHHHHHHHHo.',
        '.oHhHHHHHHHHhHo.',
        '.oHhHHHHHHHHhHo.',
        '.oHhHHHHHHHHhHo.',
        '.oHhhHHHHHHhhHo.',
        '.ohHhhHHHHhhHho.',
        '..ohhhhhhhhhho..',
        '...oooooooooo...',
      ],
    },
    right: {
      y: 2,
      rows: [
        '....ooooooo.....',
        '...oHHHHHHHo....',
        '..oHHHHHHHHHo...',
        '..oHHHHHHHHHHo..',
        '.oHHHHHHHHHHHo..',
        '.oHHHHHHHhHhHo..',
        '.oHHHHHHhSSSSo..',
        '.oHHHHHSSSSESo..',
        '.oHHHHsSSSSESo..',
        '.oHHHhsSSSSSSo..',
        '.oHHHhosSSSSo...',
        '.oHHhho.........',
        '.oHhhho.........',
        '..ohho..........',
        '...oo...........',
      ],
    },
  },
  bun: {
    down: {
      y: 0,
      rows: [
        '......oooo......',
        '.....oHHHHo.....',
        '....oohHHhoo....',
        '...oHHHHHHHHo...',
        '..oHHHHHHHHHHo..',
        '..oHHHHHHHHHHo..',
        '..oHHHhHHhHHHo..',
        '..oHhSSSSSShHo..',
        '..oHSSSSSSSSHo..',
        '..oSSESSSSESSo..',
        '..oSSESSSSESSo..',
        '..osSSSSSSSSso..',
        '...osSSSSSSso...',
      ],
    },
    up: {
      y: 0,
      rows: [
        '......oooo......',
        '.....oHHHHo.....',
        '....oohHHhoo....',
        '...oHHHHHHHHo...',
        '..oHHHHHHHHHHo..',
        '..oHHHHHHHHHHo..',
        '..oHHHHHHHHHHo..',
        '..oHHHHHHHHHHo..',
        '..ohHHHHHHHHho..',
        '..ohHHHHHHHHho..',
        '..ohhHHHHHHhho..',
        '...ohhhhhhhho...',
        '....osSSSSso....',
      ],
    },
    right: {
      y: 0,
      rows: [
        '...oooo.........',
        '..oHHHHo........',
        '..ohHHhoooo.....',
        '...oHHHHHHHo....',
        '..oHHHHHHHHHo...',
        '..oHHHHHHHHHHo..',
        '..oHHHHHHHhHHo..',
        '..oHHHHHHhSSSo..',
        '..oHHHHHhSSSSo..',
        '..ohHHHSSSSESo..',
        '..ohHHsSSSSESo..',
        '..oohhsSSSSSSo..',
        '....osSSSSSso...',
      ],
    },
  },
}

const TUNIC_FRONT: Part = {
  y: 13,
  rows: [
    '...ooCCCCCCoo...',
    '..oCCCCCCCCCCo..',
    '.oCcCCCCCCCCcCo.',
    '.oScCCCCCCCCcSo.',
    '.oSoAAAAAAAAoSo.',
    '..ooPPPPPPPPoo..',
  ],
}

const DRESS_FRONT: Part = {
  y: 13,
  rows: [
    '...ooCCCCCCoo...',
    '..oCCCCCCCCCCo..',
    '.oCcCCCCCCCCcCo.',
    '.oScCCCCCCCCcSo.',
    '.oSoAAAAAAAAoSo.',
    '..oCCCCCCCCCCo..',
    '..ocCCCCCCCCco..',
    '..oooooooooooo..',
  ],
}

const BODIES: Record<BodyStyle, DirectionalPart> = {
  tunic: {
    down: TUNIC_FRONT,
    up: TUNIC_FRONT,
    right: {
      y: 13,
      rows: [
        '....ooCCCCoo....',
        '...oCCCCCCCCo...',
        '...oCCCcCCCCo...',
        '...oCCCcCCCCo...',
        '...oAAASAAAAo...',
        '...ooPPPPPPoo...',
      ],
    },
  },
  dress: {
    down: DRESS_FRONT,
    up: DRESS_FRONT,
    right: {
      y: 13,
      rows: [
        '....ooCCCCoo....',
        '...oCCCCCCCCo...',
        '...oCCCcCCCCo...',
        '...oCCCcCCCCo...',
        '...oAAASAAAAo...',
        '..oCCCCCCCCCCo..',
        '..ocCCCCCCCCco..',
        '..oooooooooooo..',
      ],
    },
  },
  coat: {
    down: {
      y: 13,
      rows: [
        '...ooCAAAACoo...',
        '..oCCCAAAACCCo..',
        '.oCcCCAAAACCcCo.',
        '.oScCCAAAACCcSo.',
        '.oSoCCAAAACCoSo.',
        '..oCCCoPPoCCCo..',
        '..ocCCoPPoCCco..',
        '..ooooo..ooooo..',
      ],
    },
    up: {
      y: 13,
      rows: [
        '...ooCCCCCCoo...',
        '..oCCCCCCCCCCo..',
        '.oCcCCCCCCCCcCo.',
        '.oScCCCCCCCCcSo.',
        '.oSoCCCCCCCCoSo.',
        '..oCCCCcCCCCCo..',
        '..ocCCCcCCCCco..',
        '..oooooooooooo..',
      ],
    },
    right: {
      y: 13,
      rows: [
        '....ooCCCCoo....',
        '...oCCCCCCAAo...',
        '...oCCCcCCAAo...',
        '...oCCCcCCAAo...',
        '...oCCCSCCAAo...',
        '..oCCCCCCCCCo...',
        '..ocCCCCCCCCo...',
        '..ooooooooooo...',
      ],
    },
  },
}

const LEGS_FRONT = [
  ['...oPPPPPPPPo...', '...oPPPooPPPo...', '...oPPo..oPPo...', '...oBBo..oBBo...', '...oooo..oooo...'],
  ['...oPPPPPPPPo...', '...oPPPooPPPo...', '...oPPo..oBBo...', '...oBBo..oooo...', '...oooo.........'],
  ['...oPPPPPPPPo...', '...oPPPooPPPo...', '...oBBo..oPPo...', '...oooo..oBBo...', '.........oooo...'],
]

/** Leg frames per direction: [stand, step A, step B] */
const LEGS: Record<PartDirection, string[][]> = {
  down: LEGS_FRONT,
  up: LEGS_FRONT,
  right: [
    ['....oPPPPPPo....', '....oPPPPPPo....', '....opPPPPPo....', '....oBBBBBBBo...', '....ooooooooo...'],
    ['....oPPPPPPo....', '...opPPooPPPo...', '..oppo...oPPo...', '..oBBBo..oBBBo..', '..ooooo..ooooo..'],
    ['....oPPPPPPo....', '...oPPPoopPPo...', '..oPPo...oppo...', '..oBBBo..oBBBo..', '..ooooo..ooooo..'],
  ],
}
const LEGS_Y = 19

export const CHARACTER_PARTS = { heads: HEADS, bodies: BODIES, legs: LEGS, legsY: LEGS_Y }

export interface CharacterPalette {
  hair: string
  skin: string
  top: string
  accent: string
  /** Trousers, or skin for bare legs */
  bottom: string
  shoes: string
  eyes?: string
  outline?: string
}

export interface CharacterLook {
  head: HeadStyle
  body: BodyStyle
  palette: CharacterPalette
}

const SHEET_DIRECTIONS: { dir: PartDirection; mirror: boolean }[] = [
  { dir: 'down', mirror: false },
  { dir: 'right', mirror: true },
  { dir: 'right', mirror: false },
  { dir: 'up', mirror: false },
]

/**
 * Paints a 3x4 character sheet (frames x directions) from a look description.
 * @param look - head/body style and palette
 * @returns canvas of 48x96 pixels
 */
export function drawCharacterSheet(look: CharacterLook): HTMLCanvasElement {
  const { palette } = look
  const colors: Record<string, string> = {
    o: palette.outline ?? '#261a2b',
    H: palette.hair,
    h: shade(palette.hair, -0.3),
    S: palette.skin,
    s: shade(palette.skin, -0.2),
    E: palette.eyes ?? '#1f1a2e',
    W: '#f6f2e8',
    C: palette.top,
    c: shade(palette.top, -0.25),
    A: palette.accent,
    a: shade(palette.accent, -0.3),
    P: palette.bottom,
    p: shade(palette.bottom, -0.3),
    B: palette.shoes,
  }
  const p = new PixelCanvas(FRAME_WIDTH * 3, FRAME_HEIGHT * 4, false)
  SHEET_DIRECTIONS.forEach(({ dir, mirror }, row) => {
    for (let frame = 0; frame < 3; frame++) {
      const ox = frame * FRAME_WIDTH
      const oy = row * FRAME_HEIGHT
      p.pattern(LEGS[dir][frame], colors, ox, oy + LEGS_Y, mirror)
      const body = BODIES[look.body][dir]
      p.pattern(body.rows, colors, ox, oy + body.y, mirror)
      const head = HEADS[look.head][dir]
      p.pattern(head.rows, colors, ox, oy + head.y, mirror)
    }
  })
  return p.toCanvas()
}

/**
 * @param look - head/body style and palette
 * @returns sprite sheet definition that paints itself at load time
 */
export function generatedCharacter(look: CharacterLook): SpriteSheetDefinition {
  return {
    texture: { draw: () => drawCharacterSheet(look), mipmaps: false },
    frameWidth: FRAME_WIDTH,
    frameHeight: FRAME_HEIGHT,
  }
}
