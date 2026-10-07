import { createStore } from 'zustand/vanilla'

export interface DialogueState {
  speaker?: string
  text: string
  /** Number of characters revealed by the typewriter */
  visible: number
  complete: boolean
}

export interface ChoiceState {
  options: string[]
  index: number
}

/** State the React overlay needs. Per-frame game state (positions etc.) lives in the runtime, not here. */
export interface UIState {
  /** Bumped every time a map is loaded so the scene remounts */
  worldId: number
  dialogue: DialogueState | null
  choice: ChoiceState | null
  fade: { opacity: number; duration: number }
  banner: { text: string; key: number } | null
  /** Asset preload progress in [0, 1], or null once loaded */
  loading: number | null
}

export function createUIStore() {
  return createStore<UIState>(() => ({
    worldId: 0,
    dialogue: null,
    choice: null,
    fade: { opacity: 1, duration: 0 },
    banner: null,
    loading: 0,
  }))
}

export type UIStore = ReturnType<typeof createUIStore>
