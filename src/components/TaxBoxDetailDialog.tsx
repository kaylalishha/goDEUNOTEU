import { useState } from 'react'
import { useStore } from '../store/useStore'
import { formatDate, formatIDR } from '../lib/format'
import { DeadlineBadge } from './DeadlineBadge'
import { ImageLightbox } from './ImageLightbox'
import { StatusBadge } from './StatusBadge'

export function TaxBoxDetailDialog({
  boxNumber,
  onClose,
}: {
  boxNumber: string
  onClose: () => void
}) {
  const allTaxBills = useStore((s) => s.taxBills)
  const taxBills = allTaxBills.filter((t) => t.boxNumber === boxNumber)
  const getCustomerName = useStore((s) => s.getCustomerName)
  const confirmTaxBill = useStore((s) => s.confirmTaxBill)
  const rejectTaxBill = useStore((s) => s.rejectTaxBill)
  const simulateCustomerUploadTax = useStore((s) => s.simulateCustomerUploadTax)

  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(
    new Set(taxBills.filter((t) => t.status !== 'Lunas').map((t) => t.id)),
  )

  if (taxBills.length === 0) return null

  const grandTotal = taxBills.reduce((sum, t) => sum + t.total, 0)
  const lunasCount = taxBills.filter((t) => t.status === 'Lunas').length
  const publishedAt = taxBills.reduce(
    (earliest, t) => (t.publishedAt < earliest ? t.publishedAt : earliest),
    taxBills[0].publishedAt,
  )

  function toggle(id: string) {
    setExpanded((set) => {
      const next = new Set(set)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 px-4 py-8">
      <div className="w-full max-w-3xl rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-base font-bold text-rose-600">
            {boxNumber} <span className="text-slate-400">🧾</span>{' '}
            <span className="text-sm font-normal text-slate-400">
              · Dipublikasikan {formatDate(publishedAt)}
            </span>
          </h2>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="p-6">
          <div className="mb-4 grid grid-cols-3 gap-3 rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
            <div>
              <span className="block text-slate-400">Total Pajak Box</span>
              <span className="text-sm font-semibold text-slate-800">{formatIDR(grandTotal)}</span>
            </div>
            <div>
              <span className="block text-slate-400">Jumlah Customer</span>
              <span className="text-sm font-semibold text-slate-800">{taxBills.length}</span>
            </div>
            <div>
              <span className="block text-slate-400">Sudah Lunas</span>
              <span className="text-sm font-semibold text-slate-800">
                {lunasCount}/{taxBills.length}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {taxBills.map((t) => {
              const isOpen = expanded.has(t.id)
              return (
                <div key={t.id} className="overflow-hidden rounded-lg border border-slate-200">
                  <button
                    type="button"
                    onClick={() => toggle(t.id)}
                    className="flex w-full items-center justify-between gap-3 bg-white px-4 py-3 text-left hover:bg-slate-50"
                  >
                    <span className="font-semibold text-rose-600">{getCustomerName(t.customerId)}</span>
                    <span className="flex items-center gap-2">
                      <DeadlineBadge deadline={t.deadline} isPaid={t.status === 'Lunas'} />
                      <StatusBadge status={t.status} />
                      <span className="text-slate-400">{isOpen ? '︿' : '﹀'}</span>
                    </span>
                  </button>

                  {isOpen && (
                    <div className="border-t border-slate-200 bg-white px-4 py-3">
                      <div className="mb-3 grid grid-cols-2 gap-x-4 gap-y-3 text-sm text-slate-600 sm:grid-cols-4">
                        <div>
                          <span className="block text-xs text-slate-400">kartu</span>
                          <span className="font-medium text-slate-800">
                            {t.kartuCount > 0 ? `${t.kartuCount}× = ${formatIDR(t.kartuTax)}` : '—'}
                          </span>
                        </div>
                        <div>
                          <span className="block text-xs text-slate-400">non-kartu</span>
                          <span className="font-medium text-slate-800">
                            {t.nonKartuWeightGrams > 0
                              ? `${t.nonKartuWeightGrams}g = ${formatIDR(t.nonKartuShare)}`
                              : '—'}
                          </span>
                        </div>
                        <div>
                          <span className="block text-xs text-slate-400">total tagihan</span>
                          <span className="font-medium text-slate-800">{formatIDR(t.total)}</span>
                        </div>
                        <div>
                          <span className="mb-0.5 block text-xs text-slate-400">bukti transfer</span>
                          {t.buktiTransfer ? (
                            <button
                              type="button"
                              onClick={() => setLightboxSrc(t.buktiTransfer!.dataUrl)}
                              className="block h-12 w-12 overflow-hidden rounded-md border border-slate-200"
                              title="Klik untuk memperbesar"
                            >
                              <img
                                src={t.buktiTransfer.dataUrl}
                                alt="bukti transfer"
                                className="h-full w-full object-cover"
                              />
                            </button>
                          ) : (
                            <span className="font-medium text-slate-400">—</span>
                          )}
                        </div>
                      </div>

                      {t.status === 'Menunggu Konfirmasi' && (
                        <div className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                          <span className="text-xs font-medium text-amber-800">
                            Menunggu konfirmasi pembayaran
                            {t.buktiTransfer ? ` · ${t.buktiTransfer.paymentMethod}` : ''}
                          </span>
                          <div className="flex gap-2">
                            <button
                              onClick={() => confirmTaxBill(t.id)}
                              className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => rejectTaxBill(t.id)}
                              className="rounded-md bg-rose-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-rose-700"
                            >
                              Reject
                            </button>
                          </div>
                        </div>
                      )}

                      {t.status === 'Belum Bayar' && (
                        <div className="flex justify-end">
                          <button
                            onClick={() => simulateCustomerUploadTax(t.id)}
                            className="text-xs text-slate-400 underline hover:text-slate-600"
                            title="Demo helper: simulasikan customer meng-upload bukti transfer"
                          >
                            Simulate customer upload (demo)
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {lightboxSrc && <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}
    </div>
  )
}
