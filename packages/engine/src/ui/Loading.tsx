import { useUI } from '../core/context'

export function Loading({ title }: { title: string }) {
  const loading = useUI((s) => s.loading)
  if (loading === null) return null
  return (
    <div className="shoebox-loading">
      <h1 className="shoebox-loading-title">{title}</h1>
      <div className="shoebox-loading-bar">
        <div className="shoebox-loading-fill" style={{ width: `${Math.round(loading * 100)}%` }} />
      </div>
    </div>
  )
}
