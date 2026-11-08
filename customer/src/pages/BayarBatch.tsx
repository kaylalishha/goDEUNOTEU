import { useCallback, useState } from 'react'
import { BATCH_PAYMENT_METHODS } from '../config'
import { useLoginModal } from '../components/Layout'
import { PaymentPanel } from '../components/PaymentPanel'
import { BackLink, Chip, EmptyState, ImageLightbox, PageHeader, Pill, StatusBadge, primaryButton } from '../components/ui'
import { formatDate, formatIDR } from '../shared/format'
import { BATCH_BILL_STATUSES, ORDER_TYPE_OPTIONS, type BatchBillStatus, type OrderType } from '../shared/types'
import { myBatchBills, useStore } from '../store'

// Customer Feature 1 — Bayar Batch (FR-GO-1-001 … FR-GO-1-007)
export default function BayarBatch() {
  const s = useStore()
  const showLogin = useLoginModal((m) => m.show)
  const [statusFilter, setStatusFilter] = useState<BatchBillStatus | null>(null)
  const [typeFilter, setTypeFilter] = useState<OrderType | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [hasFile, setHasFile] = useState(false)
  const [lightbox, setLightbox] = useState<string | null>(null)
  const onFileStateChange = useCallback((v: boolean) => setHasFile(v), [])

  // FR-GO-1-007: warn before leaving with an unsent proof.
  const confirmLeave = () => !hasFile || window.confirm('Bukti transfer belum dikirim. Tinggalkan halaman ini?')

  const bills = s.customerId ? myBatchBills(s) : []
  const batchOf = (batchId: string) => s.batches.find((b) => b.id === batchId)
  const filtered = bills.filter(
    (b) => (!statusFilter || b.status === statusFilter) && (!typeFilter || batchOf(b.batchId)?.orderType === typeFilter),
  )
  const selected = bills.find((b) => b.id === selectedId) ?? null
  const selectedItems = selected ? s.items.filter((i) => selected.itemIds.includes(i.id)) : []
  const itemSubtotal = selectedItems.reduce((sum, i) => sum + i.priceIDR, 0)

  return (
    <div className="flex flex-col gap-5">
      <BackLink to="/id?tab=order" label="Layanan Pesanan" onLeave={confirmLeave} />
      <PageHeader title="Bayar Pesanan" description="Tagihan per batch untuk barang yang sudah dibelikan admin. Pilih satu tagihan untuk membayar." />

      {!s.customerId ? (
        <EmptyState message="Masuk untuk melihat tagihanmu. Tagihan batch kamu muncul di sini setelah kamu masuk.">
          <button type="button" onClick={showLogin} className={primaryButton}>
            Masuk
          </button>
        </EmptyState>
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap gap-2">
                <Chip active={!statusFilter} onClick={() => setStatusFilter(null)}>
                  Semua ({bills.length})
                </Chip>
                {BATCH_BILL_STATUSES.map((st) => (
                  <Chip key={st} active={statusFilter === st} onClick={() => setStatusFilter(statusFilter === st ? null : st)}>
                    {st} ({bills.filter((b) => b.status === st).length})
                  </Chip>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                <Chip active={!typeFilter} onClick={() => setTypeFilter(null)}>
                  Semua tipe
                </Chip>
                {ORDER_TYPE_OPTIONS.map((t) => (
                  <Chip key={t} active={typeFilter === t} onClick={() => setTypeFilter(typeFilter === t ? null : t)}>
                    {t}
                  </Chip>
                ))}
              </div>
            </div>

            {filtered.length === 0 ? (
              <EmptyState message={bills.length === 0 ? 'Belum ada tagihan batch untuk kamu.' : 'Tidak ada tagihan yang cocok dengan filter ini.'} />
            ) : (
              <ul className="flex flex-col gap-3">
                {filtered.map((bill) => {
                  const batch = batchOf(bill.batchId)
                  const items = s.items.filter((i) => bill.itemIds.includes(i.id))
                  const isSelected = bill.id === selectedId
                  return (
                    <li key={bill.id}>
                      <div
                        role="button"
                        tabIndex={0}
                        aria-pressed={isSelected}
                        onClick={() => setSelectedId(bill.id)}
                        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), setSelectedId(bill.id))}
                        className={`cursor-pointer rounded-xl border bg-white p-4 shadow-sm transition ${
                          isSelected ? 'border-rose-400 ring-2 ring-rose-200' : 'border-slate-200 hover:border-rose-200'
                        }`}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{bill.batchNumber}</p>
                            <p className="mt-0.5 text-xs text-slate-500">Dibuat {formatDate(bill.createdAt)}</p>
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5">
                            {batch && <Pill>{batch.orderType}</Pill>}
                            {batch && <Pill>{batch.orderStatus}</Pill>}
                            <StatusBadge status={bill.status} />
                          </div>
                        </div>

                        {batch && batch.photoDataUrls.length > 0 && (
                          <div className="mt-3 flex gap-2">
                            {batch.photoDataUrls.map((src, i) => (
                              <button
                                key={i}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setLightbox(src)
                                }}
                                aria-label={`Lihat foto ${i + 1}`}
                              >
                                <img src={src} alt="" className="h-14 w-14 rounded-md border border-slate-200 object-cover" />
                              </button>
                            ))}
                          </div>
                        )}

                        <table className="mt-3 w-full text-sm">
                          <thead className="text-left text-xs text-slate-400">
                            <tr>
                              <th className="py-1 font-medium">Item</th>
                              <th className="py-1 text-right font-medium">Harga</th>
                            </tr>
                          </thead>
                          <tbody>
                            {items.map((it) => (
                              <tr key={it.id} className="border-t border-slate-100">
                                <td className="py-1.5 text-slate-700">
                                  {it.tipeBarang}
                                  {it.tipeKartu && <span className="text-slate-400"> · {it.tipeKartu}</span>}
                                </td>
                                <td className="py-1.5 text-right text-slate-700 tabular-nums">{formatIDR(it.priceIDR)}</td>
                              </tr>
                            ))}
                            {bill.upnotesTotal > 0 && (
                              <tr className="border-t border-slate-100">
                                <td className="py-1.5 text-slate-500">Upnotes</td>
                                <td className="py-1.5 text-right text-slate-500 tabular-nums">{formatIDR(bill.upnotesTotal)}</td>
                              </tr>
                            )}
                          </tbody>
                          <tfoot>
                            <tr className="border-t border-slate-200">
                              <td className="pt-2 font-semibold text-slate-900">Total</td>
                              <td className="pt-2 text-right font-semibold text-slate-900 tabular-nums">{formatIDR(bill.total)}</td>
                            </tr>
                          </tfoot>
                        </table>
                        {bill.status === 'Lunas' && bill.paidAt && (
                          <p className="mt-2 text-xs text-emerald-700">
                            Lunas {formatDate(bill.paidAt)}
                            {bill.buktiTransfer && ` · ${bill.buktiTransfer.paymentMethod}`}
                          </p>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          <div className="lg:sticky lg:top-6">
            <PaymentPanel
              kind="batch"
              reference={selected ? `Batch: ${selected.batchNumber}` : 'Batch: —'}
              bill={selected}
              rows={[
                { label: 'Subtotal item', value: itemSubtotal },
                ...(selected && selected.upnotesTotal > 0 ? [{ label: 'Upnotes', value: selected.upnotesTotal }] : []),
              ]}
              total={selected?.total ?? 0}
              methods={BATCH_PAYMENT_METHODS}
              emptyHint="Pilih batch dulu"
              onFileStateChange={onFileStateChange}
            />
          </div>
        </div>
      )}
      {lightbox && <ImageLightbox src={lightbox} onClose={() => setLightbox(null)} />}
    </div>
  )
}
