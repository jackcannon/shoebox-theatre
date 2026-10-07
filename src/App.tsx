import { Shoebox } from './engine'
import { gameConfig } from './game/config'

function App() {
  return <Shoebox config={gameConfig} debug={import.meta.env.DEV} />
}

export default App
