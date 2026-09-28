import { createContext, useContext } from 'react'
import { useStore } from 'zustand'

import type { GameRuntime } from './GameRuntime'
import type { UIState } from './uiStore'

export const RuntimeContext = createContext<GameRuntime | null>(null)

export function useRuntime(): GameRuntime {
  const runtime = useContext(RuntimeContext)
  if (!runtime) throw new Error('useRuntime must be used inside <Shoebox>')
  return runtime
}

export function useUI<T>(selector: (state: UIState) => T): T {
  return useStore(useRuntime().ui, selector)
}
