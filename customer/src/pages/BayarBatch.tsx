import { useCallback, useEffect, useRef, useState } from 'react'
import { BATCH_PAYMENT_METHODS } from '../config'
import { useLoginModal } from '../components/Layout'
import { PaymentPanel } from '../components/PaymentPanel'
import { ImageCarousel } from '../components/ImageCarousel'
import { BackLink, Chip, EmptyState, ImageLightbox, PageHeader, StatusBadge, primaryButton } from '../components/ui'
import { formatDate, formatIDR } from '../shared/format'
import { BATCH_BILL_STATUSES, type BatchBillStatus } from '../shared/types'
import { batchOwners, myBatchBills, useStore } from '../store'

// Customer Feature 1 — Bayar Batch (FR-GO-1-001 … FR-GO-1-007)
export default function BayarBatch() {
  const s = useStore()
  const showLogin = useLoginModal((m) => m.show)
  const [statusFilter, setStatusFilter] = useState<BatchBillStatus | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [hasFile, setHasFile] = useState(false)
  const [lightbox, setLightbox] = useState<string | null>(null)
  const onFileStateChange = useCallback((v: boolean) => setHasFile(v), [])

  // FR-GO-1-007: warn before leaving with an unsent proof.
  const confirmLeave = () => !hasFile || window.confirm('Bukti transfer belum dikirim. Tinggalkan halaman ini?')

  // Tapping a card selects it; tapping the selected card again unselects it.
  // Switching or unselecting drops a chosen-but-unsent proof, so ask first.
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

  const bills = s.customerId ? myBatchBills(s) : []
  const batchOf = (batchId: string) => s.batches.find((b) => b.id === batchId)
  const filtered = bills.filter((b) => !statusFilter || b.status === statusFilter)
  const selected = bills.find((b) => b.id === selectedId) ?? null
  const selectedItems = selected ? s.items.filter((i) => selected.itemIds.includes(i.id)) : []
  const itemSubtotal = selectedItems.reduce((sum, i) => sum + i.priceIDR, 0)

  return (
    <div className="flex flex-col gap-5">
      <BackLink to="/id?tab=order" label="Layanan Pesanan" onLeave={confirmLeave} />
      <PageHeader title="Bayar Pesanan" description="Tagihan per batch untuk barang yang sudah dibelikan admin. Pilih satu tagihan untuk membayar, ketuk lagi untuk batal." />

      {!s.customerId ? (
        <EmptyState message="Masuk untuk melihat tagihanmu. Tagihan batch kamu muncul di sini setelah kamu masuk.">
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
              {BATCH_BILL_STATUSES.map((st) => (
                <Chip key={st} active={statusFilter === st} onClick={() => setStatusFilter(statusFilter === st ? null : st)}>
                  {st} ({bills.filter((b) => b.status === st).length})
                </Chip>
              ))}
            </div>

            {filtered.length === 0 ? (
              <EmptyState message={bills.length === 0 ? 'Belum ada tagihan batch untuk kamu.' : 'Tidak ada tagihan yang cocok dengan filter ini.'} />
            ) : (
              <ul className="flex flex-col gap-3">
                {filtered.map((bill) => {
                  const batch = batchOf(bill.batchId)
                  const items = s.items.filter((i) => bill.itemIds.includes(i.id))
                  const boxNumber = batch?.boxId ? s.boxes.find((x) => x.id === batch.boxId)?.boxNumber : undefined
                  const isSelected = bill.id === selectedId
                  // ReqShare: one batch is shared (and paid) by several customers, and
                  // each of them sees who else is in it, what they owe and who has paid.
                  const shareRows = batch?.orderType === 'ReqShare' ? batchOwners(s, bill.batchId) : []
                  const paidCount = shareRows.filter((r) => r.status === 'Lunas').length
                  return (
                    <li key={bill.id}>
                      {/* Same layout as the admin's batch record (BatchDetailDialog), showing only this customer's part. */}
                      <div
                        role="button"
                        tabIndex={0}
                        aria-pressed={isSelected}
                        onClick={() => toggleBill(bill.id)}
                        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), toggleBill(bill.id))}
                        className={`@container cursor-pointer overflow-hidden rounded-xl border bg-white shadow-sm transition ${
                          isSelected ? 'border-rose-400 ring-2 ring-rose-200' : 'border-slate-200 hover:border-rose-200'
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-3">
                          <p className="text-base font-bold text-rose-600">
                            {bill.batchNumber} <span className="text-slate-400">🗃️</span>{' '}
                            <span className="text-sm font-normal text-slate-400">
                              {boxNumber ? `(${boxNumber})` : '(Box belum ditentukan)'}
                              {batch && ` · ${formatDate(batch.createdAt)}`}
                            </span>
                          </p>
                          {batch && (
                            <span className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-medium text-rose-600">
                              {batch.orderType}
                            </span>
                          )}
                        </div>

                        <div className="grid gap-4 p-4 @[520px]:grid-cols-[200px_minmax(0,1fr)]">
                          <div className="mx-auto flex w-full max-w-72 flex-col gap-3 @[520px]:max-w-none">
                            <div onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                              <p className="mb-1 text-xs font-semibold tracking-wide text-slate-400 uppercase">Foto Produk</p>
                              <ImageCarousel images={batch?.photoDataUrls ?? []} onImageClick={setLightbox} />
                            </div>
                            {batch && (
                              <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
                                <div className="flex justify-between gap-2">
                                  <span className="whitespace-nowrap">Order ID (WH)</span>
                                  <span className="font-medium whitespace-nowrap text-slate-700">{batch.orderIdWH || '—'}</span>
                                </div>
                                <div className="flex justify-between gap-2">
                                  <span className="whitespace-nowrap">Status order</span>
                                  <span className="text-right font-medium text-slate-700">{batch.orderStatus}</span>
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="overflow-hidden rounded-lg border border-slate-200">
                            <div className="flex items-center justify-between gap-3 px-2.5 py-3 @[400px]:px-4">
                              <span className="font-semibold text-rose-600">Tagihan kamu</span>
                              <span className="flex items-center gap-3">
                                <span className="text-right text-xs text-slate-500">
                                  <span className="block">{items.length} item</span>
                                  <span className="font-semibold text-slate-800 tabular-nums">{formatIDR(bill.total)}</span>
                                </span>
                                <StatusBadge status={bill.status} />
                              </span>
                            </div>
                            <div className="border-t border-slate-200 px-2.5 py-3 @[400px]:px-4">
                              <div className="mb-3 grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-3">
                                <div>
                                  <span className="block text-xs text-slate-400">Tanggal bayar</span>
                                  <span className="font-medium text-slate-800">{bill.paidAt ? formatDate(bill.paidAt) : '—'}</span>
                                </div>
                                <div>
                                  <span className="mb-0.5 block text-xs text-slate-400">Bukti transfer</span>
                                  {bill.buktiTransfer ? (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        setLightbox(bill.buktiTransfer!.dataUrl)
                                      }}
                                      className="block h-12 w-12 overflow-hidden rounded-md border border-slate-200"
                                      title="Ketuk untuk memperbesar"
                                    >
                                      <img src={bill.buktiTransfer.dataUrl} alt="Bukti transfer" className="h-full w-full object-cover" />
                                    </button>
                                  ) : (
                                    <span className="font-medium text-slate-400">—</span>
                                  )}
                                </div>
                                <div>
                                  <span className="block text-xs text-slate-400">Metode bayar</span>
                                  <span className="font-medium text-slate-800">{bill.buktiTransfer?.paymentMethod ?? '—'}</span>
                                </div>
                                {bill.upnotesTotal > 0 && (
                                  <div>
                                    <span className="block text-xs text-slate-400">Upnotes</span>
                                    <span className="font-medium text-slate-800 tabular-nums">{formatIDR(bill.upnotesTotal)}</span>
                                  </div>
                                )}
                              </div>

                              <div className="overflow-x-auto rounded-md border border-slate-100">
                                <table className="min-w-full text-xs">
                                  <thead className="bg-slate-50 text-left text-[11px] text-slate-400 uppercase">
                                    <tr>
                                      <th className="px-1.5 py-2 font-semibold">Tipe Barang</th>
                                      <th className="px-1.5 py-2 font-semibold">Tipe Kartu</th>
                                      <th className="px-1.5 py-2 font-semibold">Deskripsi</th>
                                      <th className="px-1.5 py-2 text-right font-semibold">Harga (IDR)</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {items.map((it) => (
                                      <tr key={it.id}>
                                        <td className="px-1.5 py-2 text-slate-700">{it.tipeBarang}</td>
                                        <td className="px-1.5 py-2 text-slate-500">{it.tipeKartu ?? '—'}</td>
                                        <td className="px-1.5 py-2 break-words text-slate-700">{it.description || '—'}</td>
                                        <td className="px-1.5 py-2 text-right whitespace-nowrap text-slate-700 tabular-nums">{formatIDR(it.priceIDR)}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </div>
                        </div>

                        {shareRows.length > 0 && (
                          <div className="border-t border-slate-200 px-2.5 py-3 @[400px]:px-4">
                            <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                              <p className="text-xs font-semibold tracking-wide text-slate-400 uppercase">Pembayaran per customer</p>
                              <p className="text-xs text-slate-500">
                                {paidCount} dari {shareRows.length} sudah lunas
                              </p>
                            </div>
                            <div className="overflow-x-auto rounded-md border border-slate-100">
                              <table className="min-w-full text-xs">
                                <thead className="bg-slate-50 text-left text-[11px] text-slate-400 uppercase">
                                  <tr>
                                    <th className="px-1.5 py-2 font-semibold">Customer</th>
                                    <th className="px-1.5 py-2 text-right font-semibold">Item</th>
                                    <th className="px-1.5 py-2 text-right font-semibold">Tagihan</th>
                                    <th className="px-1.5 py-2 text-right font-semibold">Status</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {shareRows.map((r) => {
                                    const isMe = r.customerId === s.customerId
                                    return (
                                      <tr key={r.customerId} className={isMe ? 'bg-rose-50/60' : undefined}>
                                        <td className="px-1.5 py-2 break-words text-slate-700">
                                          {r.name}
                                          {isMe && <span className="block font-medium text-rose-600">(kamu)</span>}
                                        </td>
                                        <td className="px-1.5 py-2 text-right text-slate-700 tabular-nums">{r.itemCount}</td>
                                        <td className="px-1.5 py-2 text-right whitespace-nowrap text-slate-700 tabular-nums">{formatIDR(r.total)}</td>
                                        <td className="px-1.5 py-2 text-right">
                                          <StatusBadge status={r.status} wrap />
                                        </td>
                                      </tr>
                                    )
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
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
                kind="batch"
                reference={`Batch: ${selected.batchNumber}`}
                bill={selected}
                rows={[
                  { label: 'Subtotal item', value: itemSubtotal },
                  ...(selected.upnotesTotal > 0 ? [{ label: 'Upnotes', value: selected.upnotesTotal }] : []),
                ]}
                total={selected.total}
                methods={BATCH_PAYMENT_METHODS}
                emptyHint="Pilih batch dulu"
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
