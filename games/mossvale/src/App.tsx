import { Shoebox } from 'shoeboxtheatre'
import { gameConfig } from './config'

function App() {
  return <Shoebox config={gameConfig} debug={import.meta.env.DEV} />
}

export default App
