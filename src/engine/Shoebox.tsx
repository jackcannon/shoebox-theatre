import { useEffect, useState } from 'react'

import { GameRuntime } from './core/GameRuntime'
import { RuntimeContext } from './core/context'
import { GameCanvas } from './render/GameCanvas'
import type { GameConfig } from './types'
import { GameUI } from './ui/GameUI'

import './ui/ui.css'

/** Mounts a game: creates the runtime, the 3D canvas and the UI overlay. */
export function Shoebox({ config }: { config: GameConfig }) {
  const [runtime, setRuntime] = useState<GameRuntime | null>(null)

  useEffect(() => {
    const instance = new GameRuntime(config)
    if (import.meta.env.DEV) (window as unknown as { __shoebox?: GameRuntime }).__shoebox = instance
    setRuntime(instance)
    void instance.start()
    return () => instance.dispose()
  }, [config])

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
