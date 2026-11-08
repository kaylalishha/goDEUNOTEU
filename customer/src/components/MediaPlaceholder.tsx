import type { CSSProperties } from 'react'
import { ImageIcon } from './Icons'

// Stand-in for every photo on the page until real media exists. Replace a
// placeholder by passing `src`; the label tells whoever fills it in which
// asset belongs there.
export function MediaPlaceholder({
  label,
  src,
  className = '',
  style,
  iconSize = 22,
  active,
}: {
  label: string
  src?: string
  className?: string
  style?: CSSProperties
  iconSize?: number
  // Sets data-active (used by the hero carousel's cross-fade).
  active?: boolean
}) {
  if (src) {
    return <img src={src} alt="" className={`object-cover ${className}`} style={style} data-active={active} />
  }
  return (
    <span
      className={`media-placeholder ${className}`}
      style={style}
      role="img"
      aria-label={`Placeholder: ${label}`}
      data-active={active}
    >
      <ImageIcon size={iconSize} />
      {label && <span className="px-2">{label}</span>}
    </span>
  )
}

// Round initial badge used where the reference shows a profile photo.
export function AvatarPlaceholder({ name, src, size = 44 }: { name: string; src?: string; size?: number }) {
  const style: CSSProperties = { width: size, height: size, boxShadow: 'var(--lift-sm)' }
  if (src) return <img src={src} alt="" className="shrink-0 rounded-full object-cover" style={style} />
  return (
    <span
      className="media-placeholder shrink-0 rounded-full"
      style={{ ...style, fontSize: size * 0.36, color: 'var(--accent)' }}
      role="img"
      aria-label={`Placeholder foto ${name}`}
    >
      {name.trim().charAt(0).toUpperCase() || '?'}
    </span>
  )
}
