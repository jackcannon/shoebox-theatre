import { useEffect, useState } from 'react'

import { GameRuntime } from './core/GameRuntime'
import { RuntimeContext } from './core/context'
import { GameCanvas } from './render/GameCanvas'
import type { GameConfig } from './types'
import { GameUI } from './ui/GameUI'

/**
 * Mounts a game: creates the runtime, the 3D canvas and the UI overlay.
 * @param config - game definition; must be a stable, module-level constant
 * @param debug - exposes the runtime as `window.__shoebox` for the browser console and automation
 */
export function Shoebox({ config, debug = false }: { config: GameConfig; debug?: boolean }) {
  const [runtime, setRuntime] = useState<GameRuntime | null>(null)

  useEffect(() => {
    const instance = new GameRuntime(config)
    if (debug) (window as unknown as { __shoebox?: GameRuntime }).__shoebox = instance
    setRuntime(instance)
    void instance.start()
    return () => instance.dispose()
  }, [config, debug])

  if (!runtime) return null
  return (
    <RuntimeContext.Provider value={runtime}>
      <div className="shoebox-root">
        <GameCanvas />
        <GameUI title={config.title} />
      </div>
    </RuntimeContext.Provider>
  )
}
