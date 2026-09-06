import { useState } from 'react'
import { useStore } from '../store/useStore'
import { formatDate, formatIDR } from '../lib/format'
import { copyText } from '../lib/clipboard'
import { buildTagihanTemplate } from '../lib/tagihanTemplate'
import { ImageLightbox } from './ImageLightbox'
import { BuktiTransferReview } from './BuktiTransferReview'
import { StatusBadge } from './StatusBadge'

export function BatchDetailDialog({
  batchId,
  onClose,
  onEdit,
}: {
  batchId: string
  onClose: () => void
  onEdit: () => void
}) {
  const batch = useStore((s) => s.batches.find((b) => b.id === batchId))
  const allItems = useStore((s) => s.items)
  const allBatchBills = useStore((s) => s.batchBills)
  const items = allItems.filter((i) => i.batchId === batchId)
  const batchBills = allBatchBills.filter((b) => b.batchId === batchId)
  const getCustomerName = useStore((s) => s.getCustomerName)
  const confirmBatchBill = useStore((s) => s.confirmBatchBill)
  const rejectBatchBill = useStore((s) => s.rejectBatchBill)
  const simulateCustomerUploadBatch = useStore((s) => s.simulateCustomerUploadBatch)
  const updateBatchBillPaidAt = useStore((s) => s.updateBatchBillPaidAt)
  const pushToast = useStore((s) => s.pushToast)

  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(
    new Set(
      Array.from(new Set(items.map((i) => i.customerId))).filter((customerId) => {
        const bill = batchBills.find((b) => b.customerId === customerId)
        return !bill || bill.status !== 'Dibayar'
      }),
    ),
  )
  const [editingDateFor, setEditingDateFor] = useState<string | null>(null)
  const [dateDraft, setDateDraft] = useState('')

  if (!batch) return null

  const customerIds = Array.from(new Set(items.map((i) => i.customerId)))
  const grandTotal = items.reduce((sum, i) => sum + i.priceIDR, 0)

  const tagihanText = buildTagihanTemplate({
    batchNumber: batch.batchNumber,
    orderType: batch.orderType,
    customerLines: customerIds.map((cid) => {
      const total = items.filter((i) => i.customerId === cid).reduce((s, i) => s + i.priceIDR, 0)
      return `${getCustomerName(cid)} ${formatIDR(total)}`
    }),
  })

  function toggle(customerId: string) {
    setExpanded((set) => {
      const next = new Set(set)
      if (next.has(customerId)) next.delete(customerId)
      else next.add(customerId)
      return next
    })
  }

  async function handleCopyTagihan() {
    const ok = await copyText(tagihanText)
    pushToast(ok ? 'Teks tagihan disalin.' : 'Gagal menyalin teks tagihan.', ok ? 'success' : 'error')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 px-4 py-8">
      <div className="w-full max-w-4xl rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-rose-600">
              {batch.batchNumber} <span className="text-slate-400">🗃️</span>{' '}
              {batch.boxNumber ? `(${batch.boxNumber})` : (
                <span className="text-sm font-normal text-slate-400">(Box belum ditentukan)</span>
              )}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-600"
              title="Order Type (diisi di form New Batch Record)"
            >
              {batch.orderType}
            </span>
            <button
              onClick={onEdit}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              Edit
            </button>
            <button
              onClick={onClose}
              className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 p-6 md:grid-cols-[280px_1fr]">
          <div className="flex flex-col gap-4">
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Foto Produk
              </p>
              {batch.photoDataUrl ? (
                <button
                  type="button"
                  onClick={() => setLightboxSrc(batch.photoDataUrl!)}
                  className="group relative block w-full overflow-hidden rounded-lg border border-slate-200"
                  title="Klik untuk memperbesar"
                >
                  <img src={batch.photoDataUrl} alt="foto produk" className="aspect-square w-full object-cover" />
                  <span className="absolute inset-0 flex items-center justify-center bg-slate-900/0 text-transparent transition group-hover:bg-slate-900/30 group-hover:text-white">
                    <span className="text-xs font-medium">Perbesar</span>
                  </span>
                </button>
              ) : (
                <div className="flex aspect-square w-full flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 px-4 text-center text-xs text-slate-400">
                  foto product
                  <span className="mt-1">(yg biasa ada di notes line)</span>
                </div>
              )}
            </div>

            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Template Tagihan
              </p>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <pre className="max-h-64 overflow-y-auto whitespace-pre-wrap font-sans text-xs leading-relaxed text-slate-700">
                  {tagihanText}
                </pre>
                <button
                  onClick={handleCopyTagihan}
                  className="mt-2 text-xs font-medium text-rose-600 hover:underline"
                >
                  copy
                </button>
              </div>
            </div>

            <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
              <div className="flex justify-between">
                <span>Order status</span>
                <span className="font-medium text-slate-700">{batch.orderStatus}</span>
              </div>
              <div className="flex justify-between">
                <span>Total item</span>
                <span className="font-medium text-slate-700">{formatIDR(grandTotal)}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {customerIds.length === 0 ? (
              <p className="text-sm text-slate-500">Belum ada customer pada batch ini.</p>
            ) : (
              customerIds.map((customerId) => {
                const customerItems = items.filter((i) => i.customerId === customerId)
                const bill = batchBills.find((b) => b.customerId === customerId)
                const isOpen = expanded.has(customerId)
                return (
                  <div key={customerId} className="overflow-hidden rounded-lg border border-slate-200">
                    <button
                      type="button"
                      onClick={() => toggle(customerId)}
                      className="flex w-full items-center justify-between gap-3 bg-white px-4 py-3 text-left hover:bg-slate-50"
                    >
                      <span className="font-semibold text-rose-600">{getCustomerName(customerId)}</span>
                      <span className="flex items-center gap-2">
                        <StatusBadge status={bill?.status ?? 'Belum Dibayar'} />
                        <span className="text-slate-400">{isOpen ? '︿' : '﹀'}</span>
                      </span>
                    </button>

                    {isOpen && (
                      <div className="border-t border-slate-200 bg-white px-4 py-3">
                        <div className="mb-3 flex items-center gap-2 text-sm text-slate-600">
                          <span className="text-slate-400">payment at</span>
                          <span>:</span>
                          {editingDateFor === customerId ? (
                            <>
                              <input
                                type="date"
                                className="rounded-md border border-slate-300 px-2 py-1 text-sm"
                                value={dateDraft}
                                onChange={(e) => setDateDraft(e.target.value)}
                              />
                              <button
                                type="button"
                                className="text-xs font-medium text-emerald-600 hover:underline"
                                onClick={() => {
                                  if (!bill) return
                                  updateBatchBillPaidAt(
                                    bill.id,
                                    dateDraft ? new Date(dateDraft).toISOString() : undefined,
                                  )
                                  setEditingDateFor(null)
                                }}
                              >
                                Simpan
                              </button>
                              <button
                                type="button"
                                className="text-xs text-slate-400 hover:underline"
                                onClick={() => setEditingDateFor(null)}
                              >
                                Batal
                              </button>
                            </>
                          ) : (
                            <>
                              <span className="font-medium text-slate-800">
                                {bill?.paidAt ? formatDate(bill.paidAt) : 'None'}
                              </span>
                              {bill && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingDateFor(customerId)
                                    setDateDraft(
                                      bill.paidAt ? bill.paidAt.slice(0, 10) : '',
                                    )
                                  }}
                                  className="text-slate-400 hover:text-rose-600"
                                  title="Edit tanggal pembayaran"
                                >
                                  ✎
                                </button>
                              )}
                            </>
                          )}
                        </div>

                        {bill?.status === 'Menunggu Konfirmasi' && bill.buktiTransfer && (
                          <div className="mb-3">
                            <BuktiTransferReview
                              buktiTransfer={bill.buktiTransfer}
                              onConfirm={() => confirmBatchBill(bill.id)}
                              onReject={() => rejectBatchBill(bill.id)}
                            />
                          </div>
                        )}

                        {bill && bill.status === 'Belum Dibayar' && (
                          <div className="mb-3 flex justify-end">
                            <button
                              onClick={() => simulateCustomerUploadBatch(bill.id)}
                              className="text-xs text-slate-400 underline hover:text-slate-600"
                              title="Demo helper: simulasikan customer meng-upload bukti transfer (belum ada Customer Dashboard)"
                            >
                              Simulate customer upload (demo)
                            </button>
                          </div>
                        )}

                        {!bill && (
                          <p className="mb-3 text-xs text-slate-400">
                            Belum ada tagihan batch untuk customer ini — buat di menu Batch Payments
                            untuk mulai melacak pembayaran.
                          </p>
                        )}

                        <div className="overflow-x-auto rounded-md border border-slate-100">
                          <table className="min-w-full text-sm">
                            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-400">
                              <tr>
                                <th className="px-3 py-2">Tipe Barang</th>
                                <th className="px-3 py-2">Tipe Kartu</th>
                                <th className="px-3 py-2">Harga (IDR)</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {customerItems.map((it) => (
                                <tr key={it.id}>
                                  <td className="px-3 py-2 text-slate-700">{it.tipeBarang}</td>
                                  <td className="px-3 py-2 text-slate-500">{it.tipeKartu ?? '—'}</td>
                                  <td className="px-3 py-2 text-slate-700">{formatIDR(it.priceIDR)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      {lightboxSrc && <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}
    </div>
  )
}
