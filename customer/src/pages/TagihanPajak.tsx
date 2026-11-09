import { useCallback, useEffect, useRef, useState } from 'react'
import { TAX_PAYMENT_METHODS, TAX_REQUIRES_PAID_BATCH } from '../config'
import { useLoginModal } from '../components/Layout'
import { PaymentPanel } from '../components/PaymentPanel'
import { BackLink, Chip, DeadlineBadge, EmptyState, ImageLightbox, PageHeader, StatusBadge, primaryButton } from '../components/ui'
import { formatDate, formatIDR } from '../shared/format'
import { KARTU_FLAT_TAX_IDR, TAX_BILL_STATUSES, type Item, type TaxBill, type TaxBillStatus } from '../shared/types'
import { myTaxBills, unpaidBatchBillsForTax, useStore } from '../store'

// Customer Feature 2 — Tagihan EMS & Pajak (FR-GO-2-001 … FR-GO-2-007).
// Each card follows the admin's tax record for a box (TaxBoxDetailDialog),
// showing the box summary and this customer's own bill in full. Customers
// only see their own tax bill, never other customers' (unlike ReqShare
// batches on Bayar Pesanan).
// Supabase note: RLS only lets a customer read their own tax bill and items,
// so the box summary needs a security-definer function for the box totals.
export default function TagihanPajak() {
  const s = useStore()
  const showLogin = useLoginModal((m) => m.show)
  const [statusFilter, setStatusFilter] = useState<TaxBillStatus | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [hasFile, setHasFile] = useState(false)
  const [lightbox, setLightbox] = useState<string | null>(null)
  const onFileStateChange = useCallback((v: boolean) => setHasFile(v), [])
  const confirmLeave = () => !hasFile || window.confirm('Bukti transfer belum dikirim. Tinggalkan halaman ini?')

  // Same as Bayar Pesanan: tap to select, tap again to unselect.
  const toggleBill = (id: string) => {
    if (hasFile && !window.confirm('Bukti transfer belum dikirim. Batalkan dan pilih tagihan lain?')) return
    const next = id === selectedId ? null : id
    if (!next) setHasFile(false) // the payment panel unmounts, so it can't report this itself
    setSelectedId(next)
  }

  // On phones the payment panel sits below the list, so bring it into view.
  const panelRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (selectedId && window.matchMedia('(max-width: 1023px)').matches) {
      panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [selectedId])

  const bills = s.customerId ? myTaxBills(s) : []
  const filtered = bills.filter((t) => !statusFilter || t.status === statusFilter)
  const selected = bills.find((t) => t.id === selectedId) ?? null
  const boxNumber = (id: string) => s.boxes.find((b) => b.id === id)?.boxNumber ?? '—'
  const billItems = (t: TaxBill) => t.itemIds.map((id) => s.items.find((i) => i.id === id)).filter((i): i is Item => Boolean(i))
  const batchNumbersOf = (t: TaxBill) =>
    Array.from(new Set(billItems(t).map((i) => s.batches.find((b) => b.id === i.batchId)?.batchNumber ?? '—')))

  const blocked = selected && TAX_REQUIRES_PAID_BATCH ? unpaidBatchBillsForTax(s, selected) : []

  return (
    <div className="flex flex-col gap-5">
      <BackLink to="/id?tab=tagihan" label="Tagihan & Pembayaran" onLeave={confirmLeave} />
      <PageHeader
        title="Tagihan Pajak EMS"
        description="Pajak bea cukai dibagi per customer di tiap box: Rp5.000 per kartu, sisanya dibagi menurut berat barang non-kartu. Pilih satu tagihan untuk membayar, ketuk lagi untuk batal."
      />

      {!s.customerId ? (
        <EmptyState message="Masuk untuk melihat tagihanmu. Tagihan pajak kamu muncul di sini setelah kamu masuk.">
          <button type="button" onClick={showLogin} className={primaryButton}>
            Masuk
          </button>
        </EmptyState>
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-2">
              <Chip active={!statusFilter} onClick={() => setStatusFilter(null)}>
                Semua ({bills.length})
              </Chip>
              {TAX_BILL_STATUSES.map((st) => (
                <Chip key={st} active={statusFilter === st} onClick={() => setStatusFilter(statusFilter === st ? null : st)}>
                  {st} ({bills.filter((t) => t.status === st).length})
                </Chip>
              ))}
            </div>

            {filtered.length === 0 ? (
              <EmptyState
                message={
                  bills.length === 0
                    ? 'Belum ada tagihan pajak. Tagihan terbit setelah box kamu sampai di bea cukai.'
                    : 'Tidak ada tagihan yang cocok dengan filter ini.'
                }
              />
            ) : (
              <ul className="flex flex-col gap-3">
                {filtered.map((t) => {
                  const isSelected = t.id === selectedId
                  const boxBills = s.taxBills.filter((x) => x.boxId === t.boxId)
                  const boxTotal = boxBills.reduce((sum, x) => sum + x.total, 0)
                  const lunasCount = boxBills.filter((x) => x.status === 'Lunas').length
                  const publishedAt = boxBills.reduce((earliest, x) => (x.publishedAt < earliest ? x.publishedAt : earliest), t.publishedAt)
                  const boxBatchNumbers = Array.from(
                    new Set(s.batches.filter((b) => b.boxId === t.boxId).map((b) => b.batchNumber)),
                  ).sort()
                  const items = billItems(t)
                  const batchIds = Array.from(new Set(items.map((i) => i.batchId)))
                  // Same per-item allocation as the admin's "Rincian per Batch".
                  const itemTax = (i: Item) =>
                    i.tipeBarang === 'Kartu'
                      ? KARTU_FLAT_TAX_IDR
                      : t.nonKartuWeightGrams > 0
                        ? ((i.weightGrams ?? 0) / t.nonKartuWeightGrams) * t.nonKartuShare
                        : 0

                  return (
                    <li key={t.id}>
                      <div
                        role="button"
                        tabIndex={0}
                        aria-pressed={isSelected}
                        onClick={() => toggleBill(t.id)}
                        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), toggleBill(t.id))}
                        className={`@container cursor-pointer overflow-hidden rounded-xl border bg-white shadow-sm transition ${
                          isSelected ? 'border-rose-400 ring-2 ring-rose-200' : 'border-slate-200 hover:border-rose-200'
                        }`}
                      >
                        <div className="border-b border-slate-200 px-4 py-3">
                          <p className="text-base font-bold text-rose-600">
                            {boxNumber(t.boxId)} <span className="text-slate-400">🧾</span>{' '}
                            <span className="text-sm font-normal text-slate-400">· Dipublikasikan {formatDate(publishedAt)}</span>
                          </p>
                          {boxBatchNumbers.length > 0 && <p className="mt-0.5 text-xs text-slate-400">Batches: {boxBatchNumbers.join(', ')}</p>}
                        </div>

                        <div className="flex flex-col gap-4 p-3 @[400px]:p-4">
                          <div className="grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-3 text-xs text-slate-500 @[520px]:grid-cols-4">
                            <div>
                              <span className="block text-slate-400">Total Pajak Box</span>
                              <span className="text-sm font-semibold text-slate-800 tabular-nums">{formatIDR(boxTotal)}</span>
                            </div>
                            <div>
                              <span className="block text-slate-400">Jumlah Customer</span>
                              <span className="text-sm font-semibold text-slate-800">{boxBills.length}</span>
                            </div>
                            <div>
                              <span className="block text-slate-400">Sudah Lunas</span>
                              <span className="text-sm font-semibold text-slate-800">
                                {lunasCount}/{boxBills.length}
                              </span>
                            </div>
                            <div>
                              <span className="mb-0.5 block text-slate-400">Deadline Pembayaran</span>
                              <DeadlineBadge deadline={t.deadline} isPaid={t.status === 'Lunas'} />
                            </div>
                          </div>

                          <div className="overflow-hidden rounded-lg border border-slate-200">
                            <div className="flex items-center justify-between gap-3 px-2.5 py-3 @[400px]:px-4">
                              <span className="font-semibold text-rose-600">Tagihan kamu</span>
                              <span className="flex items-center gap-3">
                                <span className="text-right text-xs text-slate-500">
                                  <span className="block">{t.itemIds.length} item</span>
                                  <span className="font-semibold text-slate-800 tabular-nums">{formatIDR(t.total + t.lateFeeIDR)}</span>
                                </span>
                                <StatusBadge status={t.status} />
                              </span>
                            </div>
                            <div className="border-t border-slate-200 px-2.5 py-3 @[400px]:px-4">
                              <div className="mb-3 grid grid-cols-2 gap-x-4 gap-y-3 text-sm @[520px]:grid-cols-3">
                                <div>
                                  <span className="mb-0.5 block text-xs text-slate-400">Bukti transfer</span>
                                  {t.buktiTransfer ? (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        setLightbox(t.buktiTransfer!.dataUrl)
                                      }}
                                      className="block h-12 w-12 overflow-hidden rounded-md border border-slate-200"
                                      title="Ketuk untuk memperbesar"
                                    >
                                      <img src={t.buktiTransfer.dataUrl} alt="Bukti transfer" className="h-full w-full object-cover" />
                                    </button>
                                  ) : (
                                    <span className="font-medium text-slate-400">—</span>
                                  )}
                                </div>
                                <div>
                                  <span className="block text-xs text-slate-400">Metode bayar</span>
                                  <span className="font-medium text-slate-800">{t.buktiTransfer?.paymentMethod ?? '—'}</span>
                                </div>
                                <div>
                                  <span className="block text-xs text-slate-400">Pajak produk</span>
                                  <span className="font-medium text-slate-800 tabular-nums">{formatIDR(t.total)}</span>
                                </div>
                                <div>
                                  <span className="block text-xs text-slate-400">Denda telat</span>
                                  <span className="font-medium text-slate-800 tabular-nums">{formatIDR(t.lateFeeIDR)}</span>
                                </div>
                                <div>
                                  <span className="block text-xs text-slate-400">Total tagihan</span>
                                  <span className="font-semibold text-slate-800 tabular-nums">{formatIDR(t.total + t.lateFeeIDR)}</span>
                                </div>
                              </div>

                              <p className="mb-2 text-xs font-semibold tracking-wide text-slate-400 uppercase">
                                Rincian per Batch{' '}
                                <span className="font-normal tracking-normal normal-case">
                                  — acuan awal dari perhitungan proporsional. Jumlah final ada di "Total tagihan" di atas.
                                </span>
                              </p>
                              <p className="mb-1.5 text-[11px] text-slate-400 @[340px]:hidden">Geser tabel ke samping untuk melihat semua kolom.</p>
                              <div className="overflow-x-auto rounded-md border border-slate-100">
                                <table className="min-w-full text-[11px] @[520px]:text-xs">
                                  <thead className="bg-slate-50 text-left text-[11px] text-slate-400 uppercase">
                                    <tr>
                                      <th className="px-1 py-2 @[520px]:px-1.5 font-semibold">Batch</th>
                                      <th className="px-1 py-2 @[520px]:px-1.5 font-semibold">Items</th>
                                      <th className="px-1 py-2 @[520px]:px-1.5 font-semibold">Weight</th>
                                      <th className="px-1 py-2 @[520px]:px-1.5 font-semibold">Qty</th>
                                      <th className="px-1 py-2 @[520px]:px-1.5 text-right font-semibold">Tax</th>
                                      <th className="px-1 py-2 @[520px]:px-1.5 text-right font-semibold">Total</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {batchIds.map((batchId) => {
                                      const inBatch = items.filter((i) => i.batchId === batchId)
                                      return (
                                        <tr key={batchId}>
                                          <td className="px-1 py-2 @[520px]:px-1.5 align-top font-semibold text-rose-600">
                                            {s.batches.find((b) => b.id === batchId)?.batchNumber ?? 'Batch dihapus'}
                                          </td>
                                          <td className="px-1 py-2 @[520px]:px-1.5 align-top text-slate-700">
                                            {inBatch.map((i, idx) => (
                                              <div key={i.id}>
                                                {idx + 1}. {i.tipeBarang}
                                                {i.tipeKartu ? ` (${i.tipeKartu})` : ''}
                                              </div>
                                            ))}
                                          </td>
                                          <td className="px-1 py-2 @[520px]:px-1.5 align-top text-slate-500">
                                            {inBatch.map((i) => (
                                              <div key={i.id}>{i.weightGrams ? `${i.weightGrams}gr` : '—'}</div>
                                            ))}
                                          </td>
                                          <td className="px-1 py-2 @[520px]:px-1.5 align-top text-slate-500">
                                            {inBatch.map((i) => (
                                              <div key={i.id}>1</div>
                                            ))}
                                          </td>
                                          <td className="px-1 py-2 @[520px]:px-1.5 text-right align-top whitespace-nowrap text-slate-700 tabular-nums">
                                            {inBatch.map((i) => (
                                              <div key={i.id}>{formatIDR(itemTax(i))}</div>
                                            ))}
                                          </td>
                                          <td className="px-1 py-2 @[520px]:px-1.5 text-right align-top font-medium whitespace-nowrap text-slate-800 tabular-nums">
                                            {formatIDR(inBatch.reduce((sum, i) => sum + itemTax(i), 0))}
                                          </td>
                                        </tr>
                                      )
                                    })}
                                  </tbody>
                                  <tfoot>
                                    <tr className="border-t-2 border-slate-300">
                                      <td colSpan={5} className="px-1 py-2 @[520px]:px-1.5 text-right font-semibold text-slate-700">
                                        Total
                                      </td>
                                      <td className="px-1 py-2 @[520px]:px-1.5 text-right font-semibold whitespace-nowrap text-slate-900 tabular-nums">
                                        {formatIDR(t.total)}
                                      </td>
                                    </tr>
                                  </tfoot>
                                </table>
                              </div>
                            </div>
                          </div>

                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          {selected && (
            <div ref={panelRef} className="scroll-mt-4 lg:sticky lg:top-6">
              <PaymentPanel
                kind="tax"
                reference={`Box: ${boxNumber(selected.boxId)} · Batch: ${batchNumbersOf(selected).join(', ')}`}
                bill={selected}
                rows={[
                  { label: 'Pajak produk', value: selected.total },
                  ...(selected.lateFeeIDR > 0 ? [{ label: 'Denda telat', value: selected.lateFeeIDR, note: 'Ditentukan admin' }] : []),
                ]}
                total={selected.total + selected.lateFeeIDR}
                methods={TAX_PAYMENT_METHODS}
                emptyHint="Pilih tagihan dulu"
                blockedReason={blocked.length ? `Lunasi ${blocked.map((b) => b.batchNumber).join(', ')} dulu` : undefined}
                onFileStateChange={onFileStateChange}
              />
            </div>
          )}
        </div>
      )}
      {lightbox && <ImageLightbox src={lightbox} onClose={() => setLightbox(null)} />}
    </div>
  )
}
