import { AssetManager } from '../assets/AssetManager'
import { BUILTIN_TEXTURES } from '../assets/builtinTextures'
import { DIRECTION_VECTORS, directionFromVector, wait } from '../math'
import { DEFAULT_DECORATIONS } from '../render/decorations'
import { DEFAULT_PREFABS } from '../prefabs'
import { DialogueController } from '../scripting/DialogueController'
import { Flags } from '../scripting/Flags'
import type { CharacterHandle, ScriptContext } from '../scripting/ScriptContext'
import type {
  DecorationComponent,
  GameConfig,
  MapObject,
  PrefabComponent,
  Script,
  SurfaceDefinition,
  WarpTarget,
} from '../types'
import type { Character } from '../world/Character'
import { World } from '../world/World'
import { DEFAULT_SURFACES } from '../world/surfaces'

import { Input } from './Input'
import { createUIStore } from './uiStore'

const FADE_MS = 280

/**
 * Owns everything that isn't React: input, assets, the active world, scripts and transitions.
 * React components read from it every frame; the UI overlay subscribes to `ui`.
 */
export class GameRuntime {
  readonly config: GameConfig
  readonly assets = new AssetManager()
  readonly input = new Input()
  readonly ui = createUIStore()
  readonly flags = new Flags()
  readonly surfaces: Record<string, SurfaceDefinition>
  readonly decorations: Record<string, DecorationComponent>
  readonly prefabs: Record<string, PrefabComponent>
  world: World | null = null
  /** Seconds since start, shared by animated materials */
  time = 0
  private readonly dialogue: DialogueController
  private scripts = 0
  private transitioning = false
  private disposed = false
  private bannerKey = 0

  constructor(config: GameConfig) {
    this.config = config
    this.surfaces = { ...DEFAULT_SURFACES, ...config.surfaces }
    this.decorations = { ...DEFAULT_DECORATIONS, ...config.decorations }
    this.prefabs = { ...DEFAULT_PREFABS, ...config.prefabs }
    this.dialogue = new DialogueController(this.ui, this.input)
    for (const [id, source] of Object.entries({ ...BUILTIN_TEXTURES, ...config.textures })) {
      this.assets.registerTexture(id, source)
    }
    for (const [id, sheet] of Object.entries(config.characters)) this.assets.registerSpriteSheet(id, sheet)
  }

  /** Whether the player can currently move and interact */
  get playerFree(): boolean {
    return this.scripts === 0 && !this.transitioning
  }

  async start(): Promise<void> {
    this.input.attach(window)
    this.ui.setState({ loading: 0 })
    await this.assets.preload((progress) => this.ui.setState({ loading: progress }))
    if (this.disposed) return
    this.ui.setState({ loading: null })
    this.loadMap(this.config.start)
    await wait(120)
    await this.fade(0, 600)
  }

  dispose(): void {
    this.disposed = true
    this.input.detach()
    this.assets.dispose()
  }

  update(dt: number): void {
    this.time += dt
    this.input.update()
    this.dialogue.update(dt)
    const world = this.world
    if (!world) return

    const free = this.playerFree
    const axis = this.input.axis()
    world.update(dt, free ? { ...axis, run: this.input.isDown('run') } : null)
    if (!free) return

    if (this.input.wasPressed('confirm')) {
      this.interact(world)
      return
    }
    this.checkTileEvents(world, axis)
  }

  /**
   * Runs a script, locking player control until it finishes.
   * @param script - script to run
   * @param self - NPC the script belongs to
   */
  async runScript(script: Script, self?: Character): Promise<void> {
    this.scripts++
    try {
      await script(this.createContext(self))
    } catch (error) {
      console.error('Script failed', error)
    } finally {
      this.scripts--
      if (this.scripts === 0) this.dialogue.close()
    }
  }

  async warp(to: WarpTarget): Promise<void> {
    if (this.transitioning) return
    this.transitioning = true
    try {
      await this.fade(1, FADE_MS)
      this.loadMap(to)
      await wait(80)
      await this.fade(0, FADE_MS)
    } finally {
      this.transitioning = false
    }
  }

  async fade(opacity: number, duration: number): Promise<void> {
    this.ui.setState({ fade: { opacity, duration } })
    await wait(duration)
  }

  private loadMap(to: WarpTarget): void {
    const def = this.config.maps[to.map]
    if (!def) throw new Error(`Unknown map "${to.map}"`)
    const previous = this.world?.def.name
    this.world = new World(def, this.config.player, to)
    this.ui.setState((s) => ({ worldId: s.worldId + 1 }))
    if (def.showBanner !== false && def.name !== previous) {
      this.ui.setState({ banner: { text: def.name, key: ++this.bannerKey } })
    }
  }

  private interact(world: World): void {
    const { npc, object } = world.findInteraction()
    if (npc) {
      void this.talkTo(world, npc)
      return
    }
    if (object) void this.runScript(objectScript(object))
  }

  private async talkTo(world: World, npc: Character): Promise<void> {
    const def = npc.def
    const script: Script | undefined =
      def?.interact ?? (def?.dialogue ? (ctx) => ctx.say(def.dialogue ?? '', npc.name) : undefined)
    if (!script) return
    const facing = npc.facing
    npc.paused = true
    npc.lookAt = world.player
    await this.runScript(script, npc)
    npc.lookAt = null
    npc.paused = false
    if (npc.behavior.type === 'idle') npc.facing = facing
  }

  private checkTileEvents(world: World, axis: { x: number; z: number }): void {
    const { player } = world
    const tx = player.tileX
    const tz = player.tileZ
    const [lx, lz] = world.lastPlayerTile
    const entered = tx !== lx || tz !== lz
    world.lastPlayerTile = [tx, tz]

    const warp = world.warpAt(tx, tz)
    if (warp) {
      const pushing = warp.dir
        ? DIRECTION_VECTORS[warp.dir][0] * axis.x + DIRECTION_VECTORS[warp.dir][1] * axis.z > 0.5
        : entered
      if (pushing) void this.warp(warp.to)
      return
    }
    if (!entered) return
    for (const trigger of world.triggersAt(tx, tz)) {
      if (trigger.once && world.firedTriggers.has(trigger)) continue
      world.firedTriggers.add(trigger)
      void this.runScript(trigger.script)
    }
  }

  private createContext(self?: Character): ScriptContext {
    const world = () => {
      if (!this.world) throw new Error('No map is loaded')
      return this.world
    }
    const handle = (c: Character): CharacterHandle => ({
      character: c,
      face: (dir) => {
        c.facing = dir
      },
      faceToward: (other) => {
        c.facing = directionFromVector(other.character.x - c.x, other.character.z - c.z)
      },
      walk: (dir, tiles = 1) => world().walk(c, dir, tiles),
    })
    return {
      runtime: this,
      flags: this.flags,
      player: handle(world().player),
      self: self ? handle(self) : undefined,
      npc: (id) => {
        const c = world().npcs.find((n) => n.id === id)
        if (!c) throw new Error(`Unknown NPC "${id}" on map "${world().def.id}"`)
        return handle(c)
      },
      say: (text, speaker) => this.dialogue.say(Array.isArray(text) ? text : [text], speaker),
      choice: (prompt, options, speaker) => this.dialogue.choice(prompt, options, speaker),
      wait,
      fadeOut: (ms = FADE_MS) => this.fade(1, ms),
      fadeIn: (ms = FADE_MS) => this.fade(0, ms),
      warp: (to) => this.warp(to),
    }
  }
}

function objectScript(object: MapObject): Script {
  if (object.interact) return object.interact
  const text = object.text ?? ''
  return (ctx) => ctx.say(text)
}
