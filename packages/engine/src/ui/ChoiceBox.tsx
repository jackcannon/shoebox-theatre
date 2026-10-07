import { useUI } from '../core/context'

export function ChoiceBox() {
  const choice = useUI((s) => s.choice)
  const complete = useUI((s) => s.dialogue?.complete ?? false)
  if (!choice || !complete) return null
  return (
    <ul className="shoebox-panel shoebox-choice">
      {choice.options.map((option, i) => (
        <li key={i} className={i === choice.index ? 'shoebox-choice-option is-active' : 'shoebox-choice-option'}>
          <span className="shoebox-choice-cursor">▶</span>
          {option}
        </li>
      ))}
    </ul>
  )
}
