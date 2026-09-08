import { useMemo, useState } from 'react'
import { useStore } from '../store/useStore'
import { Modal } from '../components/Modal'
import { TaxCalculationForm } from '../components/TaxCalculationForm'
import { TaxBoxDetailDialog } from '../components/TaxBoxDetailDialog'
import { DeadlineBadge } from '../components/DeadlineBadge'
import { EmptyState } from '../components/EmptyState'
import { daysRemaining, formatIDR } from '../lib/format'
import { TAX_BILL_STATUSES, type TaxBill, type TaxBillStatus } from '../types'

const STATUS_PILL_TONE: Record<TaxBillStatus, string> = {
  'Belum Bayar': 'bg-rose-100 text-rose-700',
  'Menunggu Konfirmasi': 'bg-amber-100 text-amber-800',
  Lunas: 'bg-emerald-100 text-emerald-700',
}

interface BoxGroup {
  boxNumber: string
  bills: TaxBill[]
  total: number
  counts: Record<TaxBillStatus, number>
  nearestDeadline?: string
}

export default function TaxBills() {
  const customers = useStore((s) => s.customers)
  const batches = useStore((s) => s.batches)
  const items = useStore((s) => s.items)
  const taxBills = useStore((s) => s.taxBills)
  const publishTaxBills = useStore((s) => s.publishTaxBills)
  const setItemWeights = useStore((s) => s.setItemWeights)

  const [formOpen, setFormOpen] = useState(false)
  const [statusFilter, setStatusFilter] = useState<TaxBillStatus | ''>('')
  const [viewingBoxNumber, setViewingBoxNumber] = useState<string | null>(null)

  const boxOptions = useMemo(
    () => Array.from(new Set(batches.map((b) => b.boxNumber).filter(Boolean))) as string[],
    [batches],
  )

  function itemsByBox(boxNumber: string) {
    const batchIds = new Set(batches.filter((b) => b.boxNumber === boxNumber).map((b) => b.id))
    return items.filter((i) => batchIds.has(i.batchId))
  }

  function alreadyPublishedCustomerIds(boxNumber: string) {
    return new Set(taxBills.filter((t) => t.boxNumber === boxNumber).map((t) => t.customerId))
  }

  // Dashboard shows one row per box; clicking a box opens the per-customer
  // breakdown of every tax bill published for that box.
  const boxGroups: BoxGroup[] = useMemo(() => {
    const map = new Map<string, TaxBill[]>()
    for (const t of taxBills) {
      map.set(t.boxNumber, [...(map.get(t.boxNumber) ?? []), t])
    }
    return Array.from(map.entries()).map(([boxNumber, bills]) => {
      const counts = TAX_BILL_STATUSES.reduce(
        (acc, s) => {
          acc[s] = bills.filter((b) => b.status === s).length
          return acc
        },
        {} as Record<TaxBillStatus, number>,
      )
      const unpaid = bills.filter((b) => b.status !== 'Lunas')
      const nearestUnpaid = [...unpaid].sort(
        (a, b) => daysRemaining(a.deadline) - daysRemaining(b.deadline),
      )[0]
      return {
        boxNumber,
        bills,
        total: bills.reduce((sum, b) => sum + b.total, 0),
        counts,
        nearestDeadline: nearestUnpaid?.deadline,
      }
    })
  }, [taxBills])

  const filteredBoxes = statusFilter
    ? boxGroups.filter((g) => g.counts[statusFilter] > 0)
    : boxGroups
  const sortedBoxes = [...filteredBoxes].sort((a, b) => {
    if (!a.nearestDeadline) return 1
    if (!b.nearestDeadline) return -1
    return daysRemaining(a.nearestDeadline) - daysRemaining(b.nearestDeadline)
  })

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
            Hitung pembagian pajak per box, publikasikan ke customer, dan pantau deadline 7 hari. Klik
            sebuah box untuk melihat rincian tagihan tiap customer.
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
          {overdueCount} tagihan pajak sudah melewati deadline 7 hari dan masih belum lunas.
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

      {sortedBoxes.length === 0 ? (
        <EmptyState message="Belum ada tagihan pajak yang dipublikasikan." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Box</th>
                <th className="px-4 py-3">Total Pajak</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Deadline Terdekat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedBoxes.map((group) => (
                <tr
                  key={group.boxNumber}
                  className="cursor-pointer hover:bg-slate-50"
                  onClick={() => setViewingBoxNumber(group.boxNumber)}
                >
                  <td className="px-4 py-3 font-medium text-slate-900">{group.boxNumber}</td>
                  <td className="px-4 py-3 font-semibold text-slate-900">{formatIDR(group.total)}</td>
                  <td className="px-4 py-3 text-slate-700">{group.bills.length} customer</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {TAX_BILL_STATUSES.filter((s) => group.counts[s] > 0).map((s) => (
                        <span
                          key={s}
                          className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_PILL_TONE[s]}`}
                        >
                          {group.counts[s]} {s}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {group.nearestDeadline ? (
                      <DeadlineBadge deadline={group.nearestDeadline} isPaid={false} />
                    ) : (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                        Semua Lunas
                      </span>
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
            onPublish={publishTaxBills}
            onCancel={() => setFormOpen(false)}
          />
        </Modal>
      )}

      {viewingBoxNumber && (
        <TaxBoxDetailDialog boxNumber={viewingBoxNumber} onClose={() => setViewingBoxNumber(null)} />
      )}
    </div>
  )
}
