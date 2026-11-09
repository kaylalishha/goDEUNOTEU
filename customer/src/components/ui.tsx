import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { daysRemaining, formatDate } from '../shared/format'
import { useStore } from '../store'
import { ArrowRightIcon, ImageIcon } from './Icons'

// Same building blocks and Tailwind classes as the admin dashboard
// (src/components/StatusBadge.tsx, DeadlineBadge.tsx, Modal.tsx, …), so the
// two dashboards read as one product.

const TONE_CLASSES: Record<string, string> = {
  neutral: 'bg-slate-100 text-slate-700 ring-slate-200',
  warning: 'bg-amber-100 text-amber-800 ring-amber-200',
  danger: 'bg-rose-100 text-rose-700 ring-rose-200',
  success: 'bg-emerald-100 text-emerald-700 ring-emerald-200',
}

const STATUS_TONE: Record<string, keyof typeof TONE_CLASSES> = {
  'Belum Bayar': 'danger',
  'Menunggu Konfirmasi': 'warning',
  Lunas: 'success',
}

// `wrap` lets a long status ("Menunggu Konfirmasi") break onto two lines in
// tight table cells instead of widening the table.
export function StatusBadge({ status, wrap = false }: { status: string; wrap?: boolean }) {
  const tone = STATUS_TONE[status] ?? 'neutral'
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${
        wrap ? 'text-center leading-tight' : 'whitespace-nowrap'
      } ${TONE_CLASSES[tone]}`}
    >
      {status}
    </span>
  )
}

export function Pill({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center whitespace-nowrap rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
      {children}
    </span>
  )
}

// FR-GO-2-004: same thresholds as the admin's DeadlineBadge.
export function DeadlineBadge({ deadline, isPaid }: { deadline: string; isPaid: boolean }) {
  if (isPaid) return <span className="text-xs text-slate-400">Lunas</span>
  const remaining = daysRemaining(deadline)
  if (remaining < 0) {
    return (
      <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-700 ring-1 ring-inset ring-rose-200">
        Terlambat {Math.abs(remaining)} hari
      </span>
    )
  }
  if (remaining <= 2) {
    return (
      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800 ring-1 ring-inset ring-amber-200">
        {remaining} hari lagi
      </span>
    )
  }
  return <span className="text-xs text-slate-500">{remaining} hari lagi (deadline {formatDate(deadline)})</span>
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}>{children}</div>
}

export function PageHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h2 className="text-xl font-bold text-slate-900">{title}</h2>
        {description && <p className="mt-1 max-w-2xl text-sm text-slate-500">{description}</p>}
      </div>
      {action}
    </div>
  )
}

export function BackLink({ to, label, onLeave }: { to: string; label: string; onLeave?: () => boolean }) {
  return (
    <Link
      to={to}
      onClick={(e) => {
        if (onLeave && !onLeave()) e.preventDefault()
      }}
      className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900"
    >
      <ArrowRightIcon size={14} className="rotate-180" />
      {label}
    </Link>
  )
}

export function EmptyState({ message, children }: { message: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
      <p className="text-sm text-slate-500">{message}</p>
      {children}
    </div>
  )
}

export function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition ${
        active
          ? 'border-rose-600 bg-rose-600 text-white'
          : 'border-slate-300 bg-white text-slate-600 hover:border-slate-400'
      }`}
    >
      {children}
    </button>
  )
}

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 px-4 py-8"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="w-full max-w-md rounded-xl bg-white shadow-xl" role="dialog" aria-modal="true" aria-label={title}>
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Tutup"
          >
            ✕
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  )
}

export function ImageLightbox({ src, onClose }: { src: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/80 p-8" onClick={onClose}>
      <button
        onClick={onClose}
        className="absolute top-6 right-6 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
        aria-label="Tutup"
      >
        ✕
      </button>
      <img
        src={src}
        alt="pratinjau"
        className="max-h-full max-w-full rounded-lg object-contain shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  )
}

const TOAST_TONE: Record<string, string> = {
  success: 'bg-emerald-600',
  error: 'bg-rose-600',
  info: 'bg-slate-800',
}

export function Toaster() {
  const toasts = useStore((s) => s.toasts)
  const dismissToast = useStore((s) => s.dismissToast)
  return (
    <div className="pointer-events-none fixed right-4 bottom-20 z-[100] flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2 md:bottom-4">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto flex items-start justify-between gap-3 rounded-lg px-4 py-3 text-sm text-white shadow-lg ${TOAST_TONE[t.tone]}`}
        >
          <span>{t.message}</span>
          <button onClick={() => dismissToast(t.id)} className="text-white/70 hover:text-white" aria-label="Tutup">
            ✕
          </button>
        </div>
      ))}
    </div>
  )
}

// Stand-in for a photo that doesn't exist yet. Pass `src` to show the real one.
export function MediaPlaceholder({ label, src, className = '' }: { label: string; src?: string; className?: string }) {
  if (src) return <img src={src} alt="" className={`object-cover ${className}`} />
  return (
    <span
      role="img"
      aria-label={`Placeholder: ${label}`}
      className={`flex flex-col items-center justify-center gap-1.5 border border-dashed border-slate-300 bg-slate-100 text-center text-xs font-medium text-slate-400 ${className}`}
    >
      <ImageIcon size={20} />
      {label && <span className="px-2">{label}</span>}
    </span>
  )
}

export function Avatar({ name, size = 32, src }: { name: string; size?: number; src?: string }) {
  if (src) {
    return (
      <img
        src={src}
        alt=""
        className="shrink-0 rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    )
  }
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full bg-rose-100 font-semibold text-rose-700"
      style={{ width: size, height: size, fontSize: size * 0.42 }}
      aria-hidden="true"
    >
      {name.trim().charAt(0).toUpperCase() || '?'}
    </span>
  )
}

export const primaryButton =
  'inline-flex items-center justify-center gap-2 rounded-md bg-rose-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-slate-300'
export const secondaryButton =
  'inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50'
