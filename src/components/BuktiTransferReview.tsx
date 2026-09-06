import type { BuktiTransfer } from '../types'
import { formatDateTime } from '../lib/format'

export function BuktiTransferReview({
  buktiTransfer,
  onConfirm,
  onReject,
}: {
  buktiTransfer: BuktiTransfer
  onConfirm: () => void
  onReject: () => void
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
      <img
        src={buktiTransfer.dataUrl}
        alt="bukti transfer"
        className="h-14 w-14 rounded-md border border-amber-200 object-cover"
      />
      <div className="flex-1 text-xs text-amber-800">
        <p className="font-medium">{buktiTransfer.fileName}</p>
        <p className="text-amber-600">Diunggah {formatDateTime(buktiTransfer.uploadedAt)}</p>
        <p className="text-amber-600">Metode: {buktiTransfer.paymentMethod}</p>
      </div>
      <div className="flex gap-2">
        <button
          onClick={onConfirm}
          className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
        >
          Confirm
        </button>
        <button
          onClick={onReject}
          className="rounded-md bg-rose-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-rose-700"
        >
          Reject
        </button>
      </div>
    </div>
  )
}
