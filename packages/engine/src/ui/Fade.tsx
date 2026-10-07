import { useUI } from '../core/context'

export function Fade() {
  const { opacity, duration } = useUI((s) => s.fade)
  return <div className="shoebox-fade" style={{ opacity, transition: `opacity ${duration}ms linear` }} />
}
