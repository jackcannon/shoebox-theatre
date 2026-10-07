import { useUI } from '../core/context'

export function LocationBanner() {
  const banner = useUI((s) => s.banner)
  if (!banner) return null
  // A new key remounts the element, which restarts the show-then-hide CSS animation
  return (
    <div key={banner.key} className="shoebox-banner">
      <span className="shoebox-banner-text">{banner.text}</span>
    </div>
  )
}
