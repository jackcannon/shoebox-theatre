import type { GameRuntime } from '../core/GameRuntime'
import type { Direction, WarpTarget } from '../types'
import type { Character } from '../world/Character'

import type { Flags } from './Flags'

export interface CharacterHandle {
  readonly character: Character
  face(dir: Direction): void
  faceToward(other: CharacterHandle): void
  /** Walks `tiles` tiles in a straight line, ignoring collision */
  walk(dir: Direction, tiles?: number): Promise<void>
}

/** Commands available to interaction and cutscene scripts. */
export interface ScriptContext {
  readonly runtime: GameRuntime
  readonly flags: Flags
  readonly player: CharacterHandle
  /** The NPC being talked to, when the script came from an NPC */
  readonly self?: CharacterHandle
  npc(id: string): CharacterHandle
  /** Shows one dialogue page per string and waits for the player to read them */
  say(text: string | string[], speaker?: string): Promise<void>
  /** @returns index of the chosen option (cancel picks the last one) */
  choice(prompt: string, options: string[], speaker?: string): Promise<number>
  wait(ms: number): Promise<void>
  fadeOut(ms?: number): Promise<void>
  fadeIn(ms?: number): Promise<void>
  warp(to: WarpTarget): Promise<void>
}
