import { daysRemaining, formatDate } from '../lib/format'

export function DeadlineBadge({ deadline, isPaid }: { deadline: string; isPaid: boolean }) {
  if (isPaid) {
    return <span className="text-xs text-slate-400">Lunas {formatDate(deadline)}</span>
  }
  const remaining = daysRemaining(deadline)
  if (remaining < 0) {
    return (
      <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-700 ring-1 ring-inset ring-rose-200">
        Overdue {Math.abs(remaining)} hari
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
