import {
  above,
  capsule,
  ellipsoid,
  intersect,
  rotX,
  roundBox,
  segmentParam,
  smoothUnion,
  type Prim,
  type Sdf,
  type Vec3,
} from './sdf'

export type HairStyle = 'spiky' | 'short' | 'long' | 'bun'
export type Outfit = 'tunic' | 'dress' | 'coat'

/** Colours of a character model. The optional parts are only modelled when their colour is set. */
export interface CharacterModelPalette {
  skin: string
  hair: string
  /** Shirt, dress or coat */
  top: string
  /** Trousers (default `skin`, for bare legs) */
  bottom?: string
  shoes: string
  /** Adds a peaked cap */
  cap?: string
  /** Adds a badge to the front of the cap */
  emblem?: string
  /** V-neck under a tunic or coat (default `#efe4c8`) */
  undershirt?: string
  /** Tunic belt (default `#5e3b25`) */
  belt?: string
  /** Adds an apron down the front */
  apron?: string
  /** Adds a tie in the V-neck of a tunic or coat */
  tie?: string
}

/** A character described as a 3D model, rendered to a sprite sheet when the game preloads. */
export interface CharacterModel {
  hair: HairStyle
  outfit: Outfit
  palette: CharacterModelPalette
  /** Size relative to an adult (default 1). Feet stay on the ground. */
  scale?: number
}

/*
 * Model space: feet at y = 0, about 1 unit tall, facing +z, +x is the character's left. Chibi proportions: the head
 * is about 45% of the height.
 */
const B = {
  hr: 0.235,
  headY: 0.715,
  neckR: 0.05,
  shoulderY: 0.46,
  shoulderX: 0.085,
  shoulderR: 0.05,
  torsoR: 0.11,
  waistR: 0.106,
  waistY: 0.3,
  torsoDepth: 0.9,
  hipY: 0.23,
  hipX: 0.055,
  legR: 0.048,
  shinR: 0.044,
  kneeY: 0.13,
  ankleY: 0.05,
  bootH: 0.07,
  foot: [0.052, 0.038, 0.072] as Vec3,
  armR: 0.04,
  foreR: 0.036,
  handR: 0.045,
  upperArm: 0.09,
  foreArm: 0.075,
}

/** Eye centre and mouth height relative to the head centre, in head radii. */
export const FACE = { eyeX: 0.42, eyeY: -0.22, mouthY: -0.52, hr: B.hr, headY: B.headY }

export const GROUP = { head: 1, torso: 2, armL: 3, armR: 4, legL: 5, legR: 6 } as const

/** Skirt hem height and radius per outfit. */
const HEM: Record<Outfit, { y: number; r: number }> = {
  tunic: { y: 0.23, r: 0.118 },
  coat: { y: 0.1, r: 0.135 },
  dress: { y: 0.11, r: 0.16 },
}

interface Pose {
  /** Swing angles in radians, positive = forward */
  legL: number
  legR: number
  kneeL: number
  kneeR: number
  armL: number
  armR: number
}

const SWING = 0.4
const ARM_SWING = 0.5

/** Walk frames in sheet order: stand, step A, step B. */
export const POSES: Pose[] = [
  { legL: 0, legR: 0, kneeL: 0, kneeR: 0, armL: 0, armR: 0 },
  { legL: SWING, legR: -SWING * 0.85, kneeL: 0.05, kneeR: 0.55, armL: -ARM_SWING, armR: ARM_SWING },
  { legL: -SWING * 0.85, legR: SWING, kneeL: 0.55, kneeR: 0.05, armL: ARM_SWING, armR: -ARM_SWING },
]

const swingDir = (a: number): Vec3 => [0, -Math.cos(a), Math.sin(a)]
const add = (a: Vec3, b: Vec3, s = 1): Vec3 => [a[0] + b[0] * s, a[1] + b[1] * s, a[2] + b[2] * s]

function leg(side: 1 | -1, swing: number, knee: number, group: number): Prim[] {
  const hip: Vec3 = [side * B.hipX, B.hipY, 0]
  const kneeP = add(hip, swingDir(swing), B.hipY - B.kneeY)
  const ankle = add(kneeP, swingDir(swing - knee), B.kneeY - B.ankleY)
  const bootStart = 1 - (B.bootH - B.ankleY * 0.3) / (B.kneeY - B.ankleY)
  const footTilt = Math.max(0, knee - swing) * 0.6
  const footC = add(ankle, [0, -B.foot[1] * 0.35 - Math.sin(footTilt) * 0.01, B.foot[2] * 0.45])
  return [
    { group, sdf: capsule(hip, kneeP, B.legR, B.legR * 0.95), mat: 'legs' },
    {
      group,
      sdf: capsule(kneeP, ankle, B.shinR * 1.05, B.shinR),
      mat: (x, y, z) => (segmentParam(kneeP, ankle, x, y, z) > bootStart ? 'shoes' : 'legs'),
    },
    { group, sdf: rotX(ellipsoid(footC, B.foot), footTilt, ankle), mat: 'shoes' },
  ]
}

function arm(side: 1 | -1, swing: number, sleeve: number, group: number): Prim[] {
  const shoulder: Vec3 = [side * (B.shoulderX + B.shoulderR * 0.9), B.shoulderY - B.shoulderR * 0.6, 0]
  const out: Vec3 = [side * 0.12, 0, 0]
  const elbow = add(shoulder, add(swingDir(swing), out), B.upperArm)
  const hand = add(elbow, add(swingDir(swing + 0.25 + Math.max(0, swing) * 0.5), out, 0.3), B.foreArm)
  return [
    { group, sdf: capsule(shoulder, elbow, B.armR, B.armR * 0.95), mat: 'top' },
    {
      group,
      sdf: capsule(elbow, hand, B.foreR, B.foreR * 0.9),
      mat: (x, y, z) => (segmentParam(elbow, hand, x, y, z) < sleeve ? 'top' : 'skin'),
    },
    { group, sdf: ellipsoid(add(hand, swingDir(swing), B.handR * 0.5), [B.handR, B.handR * 1.1, B.handR]), mat: 'skin' },
  ]
}

const { hr, headY } = B
const CAP_EDGE = headY + hr * 0.36
const at = (p: Vec3): Vec3 => [p[0] * hr, headY + p[1] * hr, p[2] * hr]

/** Head-space shapes shared by the hair styles. */
interface HairParts {
  shell: Sdf
  /** Keeps hair off the face: behind the ears, or above the forehead */
  faceCut: Sdf
  /** Keeps hair above the nape */
  nape: Sdf
}

/** Ellipsoid tufts hanging at uneven lengths over the forehead, in head radii: centre then radii. */
const FRINGE_TUFTS: [Vec3, Vec3][] = [
  [[-0.5, 0.28, 0.84], [0.3, 0.16, 0.16]],
  [[0.02, 0.27, 0.9], [0.26, 0.18, 0.15]],
  [[0.48, 0.31, 0.84], [0.26, 0.14, 0.15]],
]

const tufts = (list: [Vec3, Vec3][]): Prim[] =>
  list.map(([c, r]) => ({ group: GROUP.head, sdf: ellipsoid(at(c), [r[0] * hr, r[1] * hr, r[2] * hr]), mat: 'hair' }))

function shortHair({ shell, faceCut, nape }: HairParts): Prim[] {
  return [
    { group: GROUP.head, sdf: intersect(shell, faceCut, nape), mat: 'hair' },
    ...tufts([
      ...FRINGE_TUFTS,
      [[-0.35, -0.38, -0.8], [0.3, 0.28, 0.22]],
      [[0.3, -0.42, -0.78], [0.28, 0.26, 0.22]],
      [[-0.92, 0.02, -0.22], [0.16, 0.28, 0.26]],
      [[0.92, 0.02, -0.22], [0.16, 0.28, 0.26]],
    ]),
  ]
}

function longHair({ faceCut, nape }: HairParts): Prim[] {
  const shell = ellipsoid([0, headY + hr * 0.05, -hr * 0.06], [hr * 1.09, hr * 1.04, hr * 1.07])
  const curtain = roundBox([0, 0.5, -hr * 0.5], [hr * 0.92, 0.2, hr * 0.44], 0.06)
  const locks = ([1, -1] as const).map((s) =>
    capsule(at([s * 0.8, 0.1, 0.22]), at([s * 0.9, -0.85, 0.14]), hr * 0.22, hr * 0.17),
  )
  const backOfHead = intersect(ellipsoid([0, headY - hr * 0.2, -hr * 0.5], [hr, hr, hr * 0.6]), nape)
  return [
    { group: GROUP.head, sdf: intersect(shell, faceCut), mat: 'hair' },
    { group: GROUP.head, sdf: intersect(curtain, above([0, 1, 0], B.shoulderY - 0.16)), mat: 'hair' },
    ...locks.map((sdf) => ({ group: GROUP.head, sdf, mat: 'hair' })),
    ...tufts(FRINGE_TUFTS),
    { group: GROUP.head, sdf: backOfHead, mat: 'hair' },
  ]
}

function bunHair({ shell, faceCut, nape }: HairParts): Prim[] {
  return [
    { group: GROUP.head, sdf: intersect(shell, faceCut, nape), mat: 'hair' },
    { group: GROUP.head, sdf: ellipsoid(at([0, 0.78, -0.5]), [hr * 0.42, hr * 0.4, hr * 0.4]), mat: 'hair' },
    ...tufts(FRINGE_TUFTS),
  ]
}

/*
 * Spikes flaring back and down from under the cap, in head radii: angle from the back of the head (positive towards
 * the character's left), base height, tip distance from the head centre, tip height, base radius.
 */
const SPIKES: [number, number, number, number, number][] = [
  [-68, 0.16, 1.34, -0.14, 0.27],
  [-24, 0.2, 1.38, -0.2, 0.28],
  [24, 0.2, 1.38, -0.2, 0.28],
  [68, 0.16, 1.34, -0.14, 0.27],
  [-44, -0.2, 1.2, -0.8, 0.27],
  [0, -0.18, 1.24, -0.86, 0.28],
  [44, -0.2, 1.2, -0.8, 0.27],
  [-84, 0.22, 1.28, -0.12, 0.24],
  [84, 0.22, 1.28, -0.12, 0.24],
]

const SPIKE_FRINGE: [Vec3, Vec3, number][] = [
  [[-0.48, 0.32, 0.55], [-0.68, 0.1, 0.94], 0.2],
  [[0.02, 0.34, 0.6], [0.06, 0.14, 0.99], 0.18],
  [[0.48, 0.32, 0.55], [0.7, 0.16, 0.92], 0.17],
]

/** Spiky hair shades by distance from the head centre: dark roots, mid tones, light tips. */
function spikyHair({ shell, faceCut, nape }: HairParts): Prim[] {
  const centre: Vec3 = [0, headY, -hr * 0.06]
  const around = (deg: number, radius: number, y: number): Vec3 => {
    const angle = (deg * Math.PI) / 180
    return [Math.sin(angle) * radius * hr, headY + y * hr, centre[2] - Math.cos(angle) * radius * hr]
  }
  const roots = (x: number, y: number, z: number) => {
    const d = Math.hypot(x - centre[0], y - centre[1], z - centre[2]) / hr
    return d < 1.1 ? 'hairLo' : d < 1.24 ? 'hair' : 'hairHi'
  }
  const spike = (a: Vec3, tip: Vec3, ra: number): Prim => ({
    group: GROUP.head,
    sdf: capsule(a, tip, ra, hr * 0.04),
    mat: roots,
  })
  const sideShell = ellipsoid([0, headY + hr * 0.04, -hr * 0.04], [hr * 1.16, hr, hr * 1.06])
  const temple: Sdf = (_x, y, z) => Math.max(z - hr * 0.36, headY - y)
  const sideburn: Sdf = (_x, y, z) =>
    Math.max(z - hr * 0.36, hr * 0.1 - z, (headY + hr * (-0.4 + 1.8 * Math.abs(z / hr - 0.23)) - y) / 2)
  const sides: Sdf = (x, y, z) => Math.min(temple(x, y, z), sideburn(x, y, z))
  return [
    { group: GROUP.head, sdf: intersect(shell, faceCut, nape), mat: 'hairLo' },
    { group: GROUP.head, sdf: intersect(sideShell, sides, (_x, y) => y - CAP_EDGE), mat: roots },
    ...SPIKES.map(([deg, y0, tipR, tipY, r]) => spike(around(deg, 0.72, y0), around(deg, tipR, tipY), r * hr)),
    ...SPIKE_FRINGE.map(([a, tip, r]) => spike(at(a), at(tip), r * hr)),
  ]
}

const HAIR: Record<HairStyle, (parts: HairParts) => Prim[]> = {
  spiky: spikyHair,
  short: shortHair,
  long: longHair,
  bun: bunHair,
}

/** Hair styles shaded by position (`hairLo`, `hair`, `hairHi`) rather than by the light. */
export const POSITION_SHADED_HAIR: ReadonlySet<HairStyle> = new Set(['spiky'])

function head(m: CharacterModel): Prim[] {
  const prims: Prim[] = [{ group: GROUP.head, sdf: ellipsoid([0, headY, 0], [hr, hr * 0.97, hr * 0.95]), mat: 'skin' }]
  prims.push(
    ...HAIR[m.hair]({
      shell: ellipsoid([0, headY + hr * 0.04, -hr * 0.06], [hr * 1.05, hr, hr * 1.03]),
      faceCut: (_x, y, z) => Math.min(z + hr * 0.12, headY + hr * 0.3 - y),
      nape: above([0, 1, 0], headY - hr * 0.6),
    }),
  )
  if (!m.palette.cap) return prims
  const dome = intersect(
    ellipsoid([0, headY + hr * 0.1, -hr * 0.03], [hr * 1.07, hr * 0.94, hr * 1.07]),
    above([0, 1, 0], CAP_EDGE),
  )
  const emblemY = headY + hr * 0.68
  const emblem = m.palette.emblem !== undefined
  prims.push({
    group: GROUP.head,
    sdf: dome,
    mat: (x, y, z) => (emblem && z > 0 && (x / (hr * 0.28)) ** 2 + ((y - emblemY) / (hr * 0.2)) ** 2 < 1 ? 'emblem' : 'cap'),
  })
  const brim = intersect(
    rotX(ellipsoid([0, CAP_EDGE, hr * 0.8], [hr * 0.8, hr * 0.075, hr * 0.56]), -0.1, [0, CAP_EDGE, hr * 0.5]),
    above([0, 0, 1], hr * 0.4),
  )
  prims.push({ group: GROUP.head, sdf: brim, mat: 'brim' })
  return prims
}

function torso(m: CharacterModel): Prim[] {
  const zs = B.torsoDepth
  const hem = HEM[m.outfit]
  const chest = capsule([0, B.shoulderY - B.torsoR * 0.55, 0], [0, B.waistY, 0], B.torsoR, B.waistR, zs)
  const skirt = capsule([0, B.waistY, 0], [0, hem.y + hem.r * 0.35, 0], B.waistR, hem.r, zs)
  const shoulderY = B.shoulderY - B.shoulderR
  const shoulders = capsule([-B.shoulderX, shoulderY, 0], [B.shoulderX, shoulderY, 0], B.shoulderR)
  const body = smoothUnion(smoothUnion(chest, shoulders, 0.03), skirt, 0.02)
  const beltH = (B.waistY - HEM.tunic.y) * 0.18
  const vDepth = (B.shoulderY - B.waistY) * (m.outfit === 'coat' ? 0.7 : 0.42)
  const vBottom = B.shoulderY - vDepth
  const { apron, tie } = m.palette
  const mat = (x: number, y: number, z: number) => {
    if (apron && z > 0 && Math.abs(x) < B.waistR * 0.75 && y > hem.y + 0.015 && y < B.shoulderY - 0.06) return 'apron'
    if (m.outfit === 'tunic' && Math.abs(y - B.waistY) < beltH) return 'belt'
    if (m.outfit !== 'dress' && z > 0 && y > vBottom && Math.abs(x) < (y - vBottom) * 0.55) {
      return tie && Math.abs(x) < 0.012 && y < B.shoulderY - 0.012 ? 'tie' : 'shirt'
    }
    return 'top'
  }
  return [
    { group: GROUP.torso, sdf: intersect(body, above([0, 1, 0], hem.y)), mat },
    { group: GROUP.torso, sdf: capsule([0, B.shoulderY - 0.01, 0], [0, headY - hr * 0.5, 0], B.neckR), mat: 'skin' },
  ]
}

/**
 * @param m - character model
 * @param pose - index into `POSES`
 * @returns every primitive of the model in that pose
 */
export function buildModel(m: CharacterModel, pose: number): Prim[] {
  const p = POSES[pose]
  const sleeve = m.outfit === 'coat' ? 0.8 : 0.2
  return [
    ...head(m),
    ...torso(m),
    ...arm(1, p.armL, sleeve, GROUP.armL),
    ...arm(-1, p.armR, sleeve, GROUP.armR),
    ...leg(1, p.legL, p.kneeL, GROUP.legL),
    ...leg(-1, p.legR, p.kneeR, GROUP.legR),
  ]
}
