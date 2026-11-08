import { useCallback, useState } from 'react'
import { TAX_PAYMENT_METHODS, TAX_REQUIRES_PAID_BATCH } from '../config'
import { useLoginModal } from '../components/Layout'
import { PaymentPanel } from '../components/PaymentPanel'
import { BackLink, Chip, DeadlineBadge, EmptyState, PageHeader, StatusBadge, primaryButton } from '../components/ui'
import { formatDate, formatDateTime, formatIDR } from '../shared/format'
import { KARTU_FLAT_TAX_IDR, TAX_BILL_STATUSES, type TaxBill, type TaxBillStatus } from '../shared/types'
import { myTaxBills, unpaidBatchBillsForTax, useStore } from '../store'

// Customer Feature 2 — Tagihan EMS & Pajak (FR-GO-2-001 … FR-GO-2-007)
export default function TagihanPajak() {
  const s = useStore()
  const showLogin = useLoginModal((m) => m.show)
  const [statusFilter, setStatusFilter] = useState<TaxBillStatus | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [hasFile, setHasFile] = useState(false)
  const onFileStateChange = useCallback((v: boolean) => setHasFile(v), [])
  const confirmLeave = () => !hasFile || window.confirm('Bukti transfer belum dikirim. Tinggalkan halaman ini?')

  const bills = s.customerId ? myTaxBills(s) : []
  const filtered = bills.filter((t) => !statusFilter || t.status === statusFilter)
  const selected = bills.find((t) => t.id === selectedId) ?? null
  const boxNumber = (id: string) => s.boxes.find((b) => b.id === id)?.boxNumber ?? '—'

  // Batches covered by a bill, from the item records the admin's allocation used.
  function coverage(t: TaxBill) {
    const items = s.items.filter((i) => t.itemIds.includes(i.id))
    const byBatch = new Map<string, typeof items>()
    for (const it of items) byBatch.set(it.batchId, [...(byBatch.get(it.batchId) ?? []), it])
    return Array.from(byBatch.entries()).map(([batchId, its]) => ({
      batchNumber: s.batches.find((b) => b.id === batchId)?.batchNumber ?? '—',
      items: its,
    }))
  }

  const blocked = selected && TAX_REQUIRES_PAID_BATCH ? unpaidBatchBillsForTax(s, selected) : []

  return (
    <div className="flex flex-col gap-5">
      <BackLink to="/id?tab=tagihan" label="Tagihan & Pembayaran" onLeave={confirmLeave} />
      <PageHeader title="Tagihan Pajak EMS" description="Pajak bea cukai dibagi per customer di tiap box: Rp5.000 per kartu, sisanya dibagi menurut berat barang non-kartu." />

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
                  const calculated = t.kartuTax + t.nonKartuShare
                  const overridden = Math.round(calculated) !== Math.round(t.total)
                  return (
                    <li key={t.id}>
                      <div
                        role="button"
                        tabIndex={0}
                        aria-pressed={isSelected}
                        onClick={() => setSelectedId(t.id)}
                        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), setSelectedId(t.id))}
                        className={`cursor-pointer rounded-xl border bg-white p-4 shadow-sm transition ${
                          isSelected ? 'border-rose-400 ring-2 ring-rose-200' : 'border-slate-200 hover:border-rose-200'
                        }`}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">Box {boxNumber(t.boxId)}</p>
                            <p className="mt-0.5 text-xs text-slate-500">Terbit {formatDate(t.publishedAt)}</p>
                          </div>
                          <StatusBadge status={t.status} />
                        </div>

                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {coverage(t).map((c) => (
                            <span key={c.batchNumber} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                              {c.batchNumber}: {c.items.map((i) => i.tipeBarang).join(', ')}
                            </span>
                          ))}
                        </div>

                        <dl className="mt-3 space-y-1 text-sm">
                          <Row label={`Kartu ${t.kartuCount} × ${formatIDR(KARTU_FLAT_TAX_IDR)}`} value={t.kartuTax} muted />
                          <Row label={`Non-kartu ${t.nonKartuWeightGrams} g (proporsional berat)`} value={t.nonKartuShare} muted />
                          <Row label={overridden ? 'Pajak produk (disesuaikan admin)' : 'Pajak produk'} value={t.total} />
                          {t.lateFeeIDR > 0 && <Row label="Denda telat" value={t.lateFeeIDR} />}
                          <div className="flex justify-between border-t border-slate-200 pt-1.5 font-semibold text-slate-900">
                            <dt>Total bayar</dt>
                            <dd className="tabular-nums">{formatIDR(t.total + t.lateFeeIDR)}</dd>
                          </div>
                        </dl>

                        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3 text-xs text-slate-500">
                          <span>Deadline {formatDateTime(t.deadline)}</span>
                          <DeadlineBadge deadline={t.deadline} isPaid={t.status === 'Lunas'} />
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          <div className="lg:sticky lg:top-6">
            <PaymentPanel
              kind="tax"
              reference={
                selected
                  ? `Box: ${boxNumber(selected.boxId)} · Batch: ${coverage(selected).map((c) => c.batchNumber).join(', ')}`
                  : 'Batch: —'
              }
              bill={selected}
              rows={
                selected
                  ? [
                      { label: 'Pajak produk', value: selected.total },
                      ...(selected.lateFeeIDR > 0 ? [{ label: 'Denda telat', value: selected.lateFeeIDR, note: 'Ditentukan admin' }] : []),
                    ]
                  : []
              }
              total={selected ? selected.total + selected.lateFeeIDR : 0}
              methods={TAX_PAYMENT_METHODS}
              emptyHint="Pilih tagihan dulu"
              blockedReason={blocked.length ? `Lunasi ${blocked.map((b) => b.batchNumber).join(', ')} dulu` : undefined}
              onFileStateChange={onFileStateChange}
            />
          </div>
        </div>
      )}
    </div>
  )
}

function Row({ label, value, muted }: { label: string; value: number; muted?: boolean }) {
  return (
    <div className={`flex justify-between gap-4 ${muted ? 'text-slate-500' : 'text-slate-700'}`}>
      <dt>{label}</dt>
      <dd className="tabular-nums">{formatIDR(value)}</dd>
    </div>
  )
}
