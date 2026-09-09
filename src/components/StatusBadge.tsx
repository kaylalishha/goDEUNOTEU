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

export function StatusBadge({ status }: { status: string }) {
  const tone = STATUS_TONE[status] ?? 'neutral'
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${TONE_CLASSES[tone]}`}
    >
      {status}
    </span>
  )
}
