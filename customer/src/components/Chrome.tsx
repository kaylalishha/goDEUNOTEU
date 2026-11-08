import { useState } from 'react'
import { CS_OPTIONS } from '../content'
import { BagIcon, CardIcon, ChatIcon, CloseIcon, HeadsetIcon, HomeIcon, UserIcon } from './Icons'

export type TabKey = 'home' | 'order' | 'tagihan' | 'profile'

const NAV_ITEMS: Array<{ key: TabKey; label: string; icon: typeof HomeIcon }> = [
  { key: 'home', label: 'Home', icon: HomeIcon },
  { key: 'order', label: 'Order', icon: BagIcon },
  { key: 'tagihan', label: 'Tagihan', icon: CardIcon },
  { key: 'profile', label: 'Profil', icon: UserIcon },
]

export function BottomNav({ active, onSelect }: { active: TabKey; onSelect: (tab: TabKey) => void }) {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-[60] px-4"
      aria-label="Navigasi utama"
      style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}
    >
      <div
        className="mx-auto flex max-w-[16rem] items-stretch gap-1 rounded-full p-1.5"
        style={{
          background: 'color-mix(in srgb, var(--surface) 90%, transparent)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          boxShadow: 'var(--lift-lg)',
        }}
      >
        {NAV_ITEMS.map(({ key, label, icon: Icon }) => {
          const isActive = key === active
          return (
            <button
              key={key}
              type="button"
              aria-label={label}
              aria-current={isActive ? 'page' : undefined}
              onClick={() => onSelect(key)}
              className="relative flex min-w-0 cursor-pointer items-center justify-center rounded-full transition-colors duration-200"
              style={{
                flex: '1 1 0px',
                minHeight: 46,
                background: isActive ? 'var(--accent-soft)' : 'transparent',
                color: isActive ? 'var(--accent)' : 'var(--ink-secondary)',
              }}
            >
              <Icon size={20} strokeWidth={isActive ? 2.2 : 1.8} />
            </button>
          )
        })}
      </div>
    </nav>
  )
}

export function CsFab() {
  const [open, setOpen] = useState(false)
  return (
    <>
      {open && (
        <>
          <div className="cs-options-backdrop" onClick={() => setOpen(false)} />
          <div className="cs-options" role="menu">
            <a className="cs-option" role="menuitem" href={CS_OPTIONS.chatAdminHref} target="_blank" rel="noopener noreferrer">
              <span className="cs-option-label">{CS_OPTIONS.chatAdminLabel}</span>
              <span className="cs-option-circle">
                <ChatIcon size={20} />
              </span>
            </a>
          </div>
        </>
      )}
      <button
        type="button"
        className="cs-fab cursor-pointer"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Bantuan"
        data-open={open}
        onClick={() => setOpen((o) => !o)}
      >
        {open ? <CloseIcon size={22} /> : <HeadsetIcon size={24} />}
      </button>
    </>
  )
}
