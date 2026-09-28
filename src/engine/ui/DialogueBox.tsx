import { useUI } from '../core/context'

export function DialogueBox() {
  const dialogue = useUI((s) => s.dialogue)
  const choiceShown = useUI((s) => s.choice !== null)
  if (!dialogue) return null
  const shown = Math.floor(dialogue.visible)
  return (
    <div className="shoebox-panel shoebox-dialogue">
      {dialogue.speaker && <div className="shoebox-nameplate">{dialogue.speaker}</div>}
      <p className="shoebox-dialogue-text">
        {dialogue.text.slice(0, shown)}
        {/* Unrevealed text still takes up space so lines don't re-wrap as letters appear */}
        <span className="shoebox-dialogue-hidden">{dialogue.text.slice(shown)}</span>
      </p>
      {dialogue.complete && !choiceShown && <span className="shoebox-dialogue-next">▼</span>}
    </div>
  )
}
