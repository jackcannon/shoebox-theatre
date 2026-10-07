import { ChoiceBox } from './ChoiceBox'
import { ControlsHint } from './ControlsHint'
import { DialogueBox } from './DialogueBox'
import { Fade } from './Fade'
import { Loading } from './Loading'
import { LocationBanner } from './LocationBanner'

import '@fontsource/pixelify-sans/400.css'
import '@fontsource/pixelify-sans/600.css'
import './ui.css'

/** DOM overlay drawn over the canvas: banner, fade, dialogue, choices and the loading screen. */
export function GameUI({ title }: { title: string }) {
  return (
    <div className="shoebox-ui">
      <LocationBanner />
      <ControlsHint />
      <Fade />
      <div className="shoebox-dialogue-area">
        <ChoiceBox />
        <DialogueBox />
      </div>
      <Loading title={title} />
    </div>
  )
}
