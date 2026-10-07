import type { Direction, Heading, NpcBehavior, NpcDefinition } from '../types'

/** Frame columns used by the walk cycle: stand, step A, stand, step B. */
const WALK_CYCLE = [0, 1, 0, 2]
/** World units travelled per animation frame */
const STRIDE_LENGTH = 0.3

interface MoveTarget {
  x: number
  z: number
  speed: number
  resolve?: () => void
}

/** Runtime state for the player and NPCs. Positions are in tile units; tile (0, 0) spans x/z 0..1. */
export class Character {
  readonly id: string
  readonly def?: NpcDefinition
  sprite: string
  name?: string
  x: number
  z: number
  y = 0
  facing: Direction
  /** Direction the sprite shows on sheets with diagonal rows; always `facing` or a diagonal that includes it */
  heading: Heading
  moving = false
  running = false
  /** Distance walked, drives the walk-cycle animation */
  stride = 0
  /** Half-size of the collision box */
  readonly radius = 0.3
  target: MoveTarget | null = null
  behavior: NpcBehavior
  homeX: number
  homeZ: number
  aiTimer = 1 + Math.random() * 2
  /** Suspends AI (e.g. while talking) */
  paused = false
  /** Keeps facing another character while idle */
  lookAt: Character | null = null

  constructor(options: { id: string; sprite: string; tileX: number; tileZ: number; facing?: Direction; def?: NpcDefinition }) {
    this.id = options.id
    this.def = options.def
    this.sprite = options.sprite
    this.name = options.def?.name
    this.x = options.tileX + 0.5
    this.z = options.tileZ + 0.5
    this.facing = options.facing ?? 'down'
    this.heading = this.facing
    this.behavior = options.def?.behavior ?? { type: 'idle' }
    this.homeX = options.tileX
    this.homeZ = options.tileZ
  }

  get tileX(): number {
    return Math.floor(this.x)
  }

  get tileZ(): number {
    return Math.floor(this.z)
  }

  /** @returns sprite-sheet column for the current pose */
  frame(): number {
    if (!this.moving) return 0
    return WALK_CYCLE[Math.floor(this.stride / STRIDE_LENGTH) % WALK_CYCLE.length]
  }

  /**
   * Walks in a straight line to a tile centre, ignoring collision. Used by AI steps and scripts.
   * @param tileX - destination tile x
   * @param tileZ - destination tile z
   * @param speed - tiles per second
   * @returns promise resolved on arrival
   */
  moveTo(tileX: number, tileZ: number, speed: number): Promise<void> {
    this.target?.resolve?.()
    return new Promise((resolve) => {
      this.target = { x: tileX + 0.5, z: tileZ + 0.5, speed, resolve }
    })
  }
}
