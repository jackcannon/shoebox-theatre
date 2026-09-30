import { ALL_DIRECTIONS, DIRECTION_VECTORS, damp, directionFromVector, headingFromVector, headingIncludes } from '../math'
import type { Direction, MapDefinition, MapObject, PlayerSettings, TriggerDefinition, WarpDefinition, WarpTarget } from '../types'

import { Character } from './Character'
import { TileMap } from './TileMap'
import { boxAround, moveBox, type Box } from './collision'

export interface PlayerControl {
  x: number
  z: number
  run: boolean
}

const NPC_SPEED = 2.2
/** Wider than the player's box so side-by-side sprites barely overlap while talking */
const NPC_HALF_SIZE = 0.45
const SCRIPT_SPEED = 3.2
const NUDGE_RANGE = 0.42
const INTERACT_REACH = 0.8
const INTERACT_RADIUS = 0.75

/** One loaded map: tiles, objects and the characters walking around it. */
export class World {
  readonly def: MapDefinition
  readonly map: TileMap
  readonly player: Character
  readonly npcs: Character[]
  readonly characters: Character[]
  readonly firedTriggers = new Set<TriggerDefinition>()
  /** Last tile the player stood on, used to detect entering warp/trigger tiles */
  lastPlayerTile: [number, number]
  private readonly objectGrid: (MapObject | undefined)[]
  private readonly solidGrid: Uint8Array
  private readonly walkSpeed: number
  private readonly runSpeed: number

  constructor(def: MapDefinition, player: PlayerSettings, spawn: WarpTarget) {
    this.def = def
    this.map = new TileMap(def)
    this.walkSpeed = player.walkSpeed ?? 3.6
    this.runSpeed = player.runSpeed ?? 6.2

    const size = this.map.width * this.map.height
    this.objectGrid = new Array(size)
    this.solidGrid = new Uint8Array(size)
    for (const object of def.objects ?? []) {
      for (let z = object.y; z < object.y + (object.d ?? 1); z++) {
        for (let x = object.x; x < object.x + (object.w ?? 1); x++) {
          if (!this.map.inBounds(x, z)) continue
          const i = z * this.map.width + x
          if (object.interact || object.text || !this.objectGrid[i]) this.objectGrid[i] = object
          if (object.solid !== false) this.solidGrid[i] = 1
        }
      }
    }

    this.player = new Character({ id: 'player', sprite: player.sprite, tileX: spawn.x, tileZ: spawn.y, facing: spawn.facing })
    this.npcs = (def.npcs ?? []).map(
      (npc) => new Character({ id: npc.id, sprite: npc.sprite, tileX: npc.x, tileZ: npc.y, facing: npc.facing, def: npc }),
    )
    this.characters = [this.player, ...this.npcs]
    for (const c of this.characters) c.y = this.map.heightAt(c.x, c.z)
    this.lastPlayerTile = [spawn.x, spawn.y]
  }

  /** Static solidity: terrain plus object footprints. */
  isTileSolid = (x: number, z: number): boolean => {
    if (this.map.isSolid(x, z)) return true
    return this.solidGrid[z * this.map.width + x] === 1
  }

  objectAt(x: number, z: number): MapObject | undefined {
    return this.map.inBounds(x, z) ? this.objectGrid[z * this.map.width + x] : undefined
  }

  warpAt(x: number, z: number): WarpDefinition | undefined {
    return this.def.warps?.find((w) => w.x === x && w.y === z)
  }

  triggersAt(x: number, z: number): TriggerDefinition[] {
    return (this.def.triggers ?? []).filter(
      (t) => x >= t.x && z >= t.y && x < t.x + (t.w ?? 1) && z < t.y + (t.d ?? 1),
    )
  }

  /** @returns the NPC or object the player is facing, if any */
  findInteraction(): { npc?: Character; object?: MapObject } {
    const [fx, fz] = DIRECTION_VECTORS[this.player.facing]
    const px = this.player.x + fx * INTERACT_REACH
    const pz = this.player.z + fz * INTERACT_REACH
    let npc: Character | undefined
    let best = INTERACT_RADIUS
    for (const other of this.npcs) {
      const d = Math.hypot(other.x - px, other.z - pz)
      if (d < best) {
        best = d
        npc = other
      }
    }
    if (npc) return { npc }
    const object = this.objectAt(Math.floor(px), Math.floor(pz))
    if (object && (object.interact || object.text)) return { object }
    return {}
  }

  /**
   * Scripted walk along a cardinal direction.
   * @param c - character to move
   * @param dir - direction to walk
   * @param tiles - number of tiles
   * @returns promise resolved on arrival
   */
  walk(c: Character, dir: Direction, tiles: number): Promise<void> {
    const [dx, dz] = DIRECTION_VECTORS[dir]
    c.facing = dir
    return c.moveTo(c.tileX + dx * tiles, c.tileZ + dz * tiles, SCRIPT_SPEED)
  }

  update(dt: number, control: PlayerControl | null): void {
    for (const c of this.characters) {
      const prevX = c.x
      const prevZ = c.z
      if (c.target) this.stepToward(c, dt)
      else if (c === this.player) {
        if (control) this.movePlayer(control, dt)
      } else if (!c.paused) this.updateAi(c, dt)

      if (!c.target && c.lookAt) c.facing = directionFromVector(c.lookAt.x - c.x, c.lookAt.z - c.z)
      if (!headingIncludes(c.heading, c.facing)) c.heading = c.facing
      const moved = Math.hypot(c.x - prevX, c.z - prevZ)
      c.moving = moved > 1e-5
      c.stride += moved
      c.y = damp(c.y, this.map.heightAt(c.x, c.z), 14, dt)
    }
  }

  private dynamicBoxes(except: Character): Box[] {
    const boxes: Box[] = []
    for (const c of this.npcs) {
      if (c === except) continue
      boxes.push(boxAround(c.x, c.z, NPC_HALF_SIZE))
      if (c.target) boxes.push(boxAround(c.target.x, c.target.z, NPC_HALF_SIZE))
    }
    return boxes
  }

  private movePlayer(control: PlayerControl, dt: number): void {
    const p = this.player
    const len = Math.hypot(control.x, control.z)
    p.running = control.run
    if (len < 0.2) return

    p.facing = facingFromInput(control.x, control.z, p.facing)
    p.heading = headingFromVector(control.x, control.z)
    const scale = Math.min(1, len) / len
    const speed = (control.run ? this.runSpeed : this.walkSpeed) * dt
    const dx = control.x * scale * speed
    const dz = control.z * scale * speed
    const boxes = this.dynamicBoxes(p)
    const result = moveBox(p.x, p.z, p.radius, dx, dz, this.isTileSolid, boxes)
    p.x = result.x
    p.z = result.z

    // Slide around corners so 1-tile gaps (doors, paths) are easy to line up with.
    const onlyZ = Math.abs(dx) < 1e-6 && result.blockedZ
    const onlyX = Math.abs(dz) < 1e-6 && result.blockedX
    if (!onlyZ && !onlyX) return
    for (const offset of nudgeOffsets()) {
      const ox = onlyZ ? offset : 0
      const oz = onlyX ? offset : 0
      const probe = moveBox(p.x + ox, p.z + oz, p.radius, dx, dz, this.isTileSolid, boxes)
      const clear = onlyZ ? !probe.blockedZ : !probe.blockedX
      if (!clear) continue
      const path = moveBox(p.x, p.z, p.radius, ox, oz, this.isTileSolid, boxes)
      if (path.blockedX || path.blockedZ) continue
      const step = Math.min(speed, Math.abs(offset)) * Math.sign(offset)
      p.x += onlyZ ? step : 0
      p.z += onlyX ? step : 0
      return
    }
  }

  private stepToward(c: Character, dt: number): void {
    const t = c.target
    if (!t) return
    const dx = t.x - c.x
    const dz = t.z - c.z
    const dist = Math.hypot(dx, dz)
    const step = t.speed * dt
    if (dist > 1e-4) {
      c.facing = directionFromVector(dx, dz)
      c.heading = headingFromVector(dx, dz)
    }
    if (step >= dist) {
      c.x = t.x
      c.z = t.z
      c.target = null
      t.resolve?.()
    } else {
      c.x += (dx / dist) * step
      c.z += (dz / dist) * step
    }
  }

  private updateAi(c: Character, dt: number): void {
    const behavior = c.behavior
    if (behavior.type === 'idle') return
    c.aiTimer -= dt
    if (c.aiTimer > 0) return
    const interval = behavior.interval ?? (behavior.type === 'look' ? 3 : 2.2)
    c.aiTimer = interval * (0.6 + Math.random() * 0.8)

    const dir = ALL_DIRECTIONS[Math.floor(Math.random() * 4)]
    c.facing = dir
    if (behavior.type !== 'wander') return
    const [dx, dz] = DIRECTION_VECTORS[dir]
    const tx = c.tileX + dx
    const tz = c.tileZ + dz
    if (Math.abs(tx - c.homeX) > behavior.radius || Math.abs(tz - c.homeZ) > behavior.radius) return
    if (!this.canNpcEnter(tx, tz, c)) return
    void c.moveTo(tx, tz, NPC_SPEED)
  }

  private canNpcEnter(x: number, z: number, self: Character): boolean {
    if (this.isTileSolid(x, z) || this.warpAt(x, z) || this.triggersAt(x, z).length) return false
    for (const other of this.npcs) {
      if (other === self) continue
      if (other.tileX === x && other.tileZ === z) return false
      if (other.target && Math.floor(other.target.x) === x && Math.floor(other.target.z) === z) return false
    }
    const p = this.player
    const margin = p.radius + 0.5
    return Math.abs(p.x - (x + 0.5)) >= margin || Math.abs(p.z - (z + 0.5)) >= margin
  }
}

/**
 * Chooses a 4-way facing from analogue/diagonal input, keeping the current facing when it is still being pressed.
 * @param x - input x
 * @param z - input z
 * @param current - current facing
 * @returns new facing
 */
export function facingFromInput(x: number, z: number, current: Direction): Direction {
  const horizontal = Math.abs(x) > 0.3
  const vertical = Math.abs(z) > 0.3
  if (horizontal && vertical) {
    const [cx, cz] = DIRECTION_VECTORS[current]
    if (cx !== 0 && Math.sign(cx) === Math.sign(x)) return current
    if (cz !== 0 && Math.sign(cz) === Math.sign(z)) return current
  }
  return directionFromVector(x, z)
}

function nudgeOffsets(): number[] {
  const offsets: number[] = []
  for (let d = 0.05; d <= NUDGE_RANGE; d += 0.05) offsets.push(-d, d)
  return offsets
}
