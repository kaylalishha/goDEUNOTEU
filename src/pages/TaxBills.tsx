import { useMemo, useState } from 'react'
import { useStore } from '../store/useStore'
import { Modal } from '../components/Modal'
import { TaxCalculationForm } from '../components/TaxCalculationForm'
import { StatusBadge } from '../components/StatusBadge'
import { BuktiTransferReview } from '../components/BuktiTransferReview'
import { EmptyState } from '../components/EmptyState'
import { daysRemaining, formatDate, formatIDR } from '../lib/format'
import { TAX_BILL_STATUSES, type TaxBillStatus } from '../types'

function DeadlineBadge({ deadline, status }: { deadline: string; status: TaxBillStatus }) {
  if (status === 'Lunas') {
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

export default function TaxBills() {
  const customers = useStore((s) => s.customers)
  const batches = useStore((s) => s.batches)
  const items = useStore((s) => s.items)
  const taxBills = useStore((s) => s.taxBills)
  const getCustomerName = useStore((s) => s.getCustomerName)
  const publishTaxBills = useStore((s) => s.publishTaxBills)
  const setItemWeights = useStore((s) => s.setItemWeights)
  const confirmTaxBill = useStore((s) => s.confirmTaxBill)
  const rejectTaxBill = useStore((s) => s.rejectTaxBill)
  const simulateCustomerUploadTax = useStore((s) => s.simulateCustomerUploadTax)

  const [formOpen, setFormOpen] = useState(false)
  const [statusFilter, setStatusFilter] = useState<TaxBillStatus | ''>('')

  const boxOptions = useMemo(
    () => Array.from(new Set(batches.map((b) => b.boxNumber))),
    [batches],
  )

  function itemsByBox(boxNumber: string) {
    const batchIds = new Set(batches.filter((b) => b.boxNumber === boxNumber).map((b) => b.id))
    return items.filter((i) => batchIds.has(i.batchId))
  }

  function alreadyPublishedCustomerIds(boxNumber: string) {
    return new Set(taxBills.filter((t) => t.boxNumber === boxNumber).map((t) => t.customerId))
  }

  const filtered = statusFilter ? taxBills.filter((t) => t.status === statusFilter) : taxBills
  const sorted = [...filtered].sort((a, b) => daysRemaining(a.deadline) - daysRemaining(b.deadline))

  const counts = TAX_BILL_STATUSES.reduce<Record<string, number>>((acc, s) => {
    acc[s] = taxBills.filter((t) => t.status === s).length
    return acc
  }, {})
  const overdueCount = taxBills.filter((t) => t.status !== 'Lunas' && daysRemaining(t.deadline) < 0).length

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">C · Tax Bill Management (Tagihan Pajak EMS)</h2>
          <p className="text-sm text-slate-500">
            Hitung pembagian pajak per box, publikasikan ke customer, dan pantau deadline 7 hari.
          </p>
        </div>
        <button
          onClick={() => setFormOpen(true)}
          className="rounded-md bg-rose-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-rose-700"
        >
          + Calculate & Publish
        </button>
      </div>

      {overdueCount > 0 && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-700">
          {overdueCount} tagihan pajak sudah melewati deadline 7 hari dan masih Belum Bayar.
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setStatusFilter('')}
          className={`rounded-full px-3 py-1.5 text-xs font-medium ring-1 ring-inset ${
            statusFilter === '' ? 'bg-slate-900 text-white ring-slate-900' : 'bg-white text-slate-600 ring-slate-200'
          }`}
        >
          Semua ({taxBills.length})
        </button>
        {TAX_BILL_STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium ring-1 ring-inset ${
              statusFilter === s ? 'bg-slate-900 text-white ring-slate-900' : 'bg-white text-slate-600 ring-slate-200'
            }`}
          >
            {s} ({counts[s]})
          </button>
        ))}
      </div>

      {sorted.length === 0 ? (
        <EmptyState message="Tidak ada tagihan pajak dengan status ini." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Box</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Rincian</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Deadline</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sorted.map((t) => (
                <tr key={t.id} className="align-top hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{t.boxNumber}</td>
                  <td className="px-4 py-3 text-slate-700">{getCustomerName(t.customerId)}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {t.kartuCount > 0 && <div>{t.kartuCount}× kartu = {formatIDR(t.kartuTax)}</div>}
                    {t.nonKartuWeightGrams > 0 && (
                      <div>{t.nonKartuWeightGrams}g non-kartu = {formatIDR(t.nonKartuShare)}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-900">{formatIDR(t.total)}</td>
                  <td className="px-4 py-3">
                    <DeadlineBadge deadline={t.deadline} status={t.status} />
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={t.status} />
                  </td>
                  <td className="px-4 py-3">
                    {t.status === 'Menunggu Konfirmasi' && t.buktiTransfer && (
                      <BuktiTransferReview
                        buktiTransfer={t.buktiTransfer}
                        onConfirm={() => confirmTaxBill(t.id)}
                        onReject={() => rejectTaxBill(t.id)}
                      />
                    )}
                    {t.status === 'Belum Bayar' && (
                      <button
                        onClick={() => simulateCustomerUploadTax(t.id)}
                        className="text-xs text-slate-400 underline hover:text-slate-600"
                        title="Demo helper: simulasikan customer meng-upload bukti transfer"
                      >
                        Simulate upload (demo)
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {formOpen && (
        <Modal title="Calculate & Publish Tax Bill" onClose={() => setFormOpen(false)} wide>
          <TaxCalculationForm
            boxOptions={boxOptions}
            itemsByBox={itemsByBox}
            customers={customers}
            alreadyPublishedCustomerIds={alreadyPublishedCustomerIds}
            onSaveWeights={setItemWeights}
            onPublish={(bills) => {
              publishTaxBills(bills)
              setFormOpen(false)
            }}
            onCancel={() => setFormOpen(false)}
          />
        </Modal>
      )}
    </div>
  )
}
