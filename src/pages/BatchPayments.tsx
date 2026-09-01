import { useMemo, useState } from 'react'
import { useStore } from '../store/useStore'
import { Modal } from '../components/Modal'
import { CreateBatchBillForm } from '../components/CreateBatchBillForm'
import { StatusBadge } from '../components/StatusBadge'
import { BuktiTransferReview } from '../components/BuktiTransferReview'
import { EmptyState } from '../components/EmptyState'
import { formatDate, formatIDR } from '../lib/format'
import { BATCH_BILL_STATUSES, type BatchBillStatus } from '../types'

export default function BatchPayments() {
  const customers = useStore((s) => s.customers)
  const items = useStore((s) => s.items)
  const batchBills = useStore((s) => s.batchBills)
  const getCustomerName = useStore((s) => s.getCustomerName)
  const createBatchBill = useStore((s) => s.createBatchBill)
  const confirmBatchBill = useStore((s) => s.confirmBatchBill)
  const rejectBatchBill = useStore((s) => s.rejectBatchBill)
  const simulateCustomerUploadBatch = useStore((s) => s.simulateCustomerUploadBatch)

  const [formOpen, setFormOpen] = useState(false)
  const [statusFilter, setStatusFilter] = useState<BatchBillStatus | ''>('')

  const existingBillItemIds = useMemo(
    () => new Set(batchBills.flatMap((b) => b.itemIds)),
    [batchBills],
  )

  const filtered = statusFilter ? batchBills.filter((b) => b.status === statusFilter) : batchBills

  const counts = BATCH_BILL_STATUSES.reduce<Record<string, number>>((acc, s) => {
    acc[s] = batchBills.filter((b) => b.status === s).length
    return acc
  }, {})

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">B · Batch Payment Management</h2>
          <p className="text-sm text-slate-500">
            Terbitkan tagihan batch per customer, lalu konfirmasi bukti transfer tanpa koordinasi manual di LINE.
          </p>
        </div>
        <button
          onClick={() => setFormOpen(true)}
          className="rounded-md bg-rose-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-rose-700"
        >
          + Create Batch Bill
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setStatusFilter('')}
          className={`rounded-full px-3 py-1.5 text-xs font-medium ring-1 ring-inset ${
            statusFilter === '' ? 'bg-slate-900 text-white ring-slate-900' : 'bg-white text-slate-600 ring-slate-200'
          }`}
        >
          Semua ({batchBills.length})
        </button>
        {BATCH_BILL_STATUSES.map((s) => (
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

      {filtered.length === 0 ? (
        <EmptyState message="Tidak ada tagihan batch dengan status ini." />
      ) : (
        <div className="flex flex-col gap-4">
          {filtered.map((bill) => (
            <div key={bill.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {getCustomerName(bill.customerId)} · {bill.batchNumber}
                  </p>
                  <p className="text-xs text-slate-400">Dibuat {formatDate(bill.createdAt)}</p>
                </div>
                <StatusBadge status={bill.status} />
              </div>

              <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="sm:col-span-2">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Item ({bill.itemIds.length})
                  </p>
                  <ul className="space-y-1 text-sm text-slate-600">
                    {bill.itemIds.map((itemId) => {
                      const item = items.find((i) => i.id === itemId)
                      if (!item) return null
                      return (
                        <li key={itemId} className="flex justify-between">
                          <span>
                            {item.tipeBarang}
                            {item.tipeKartu ? ` · ${item.tipeKartu}` : ''}
                          </span>
                          <span>{formatIDR(item.priceIDR)}</span>
                        </li>
                      )
                    })}
                    {bill.upnotesTotal > 0 && (
                      <li className="flex justify-between text-slate-500">
                        <span>Upnotes</span>
                        <span>{formatIDR(bill.upnotesTotal)}</span>
                      </li>
                    )}
                  </ul>
                </div>
                <div className="flex flex-col justify-between rounded-lg bg-slate-50 p-3">
                  <div>
                    <p className="text-xs text-slate-400">Total Tagihan</p>
                    <p className="text-lg font-bold text-slate-900">{formatIDR(bill.total)}</p>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">{bill.bankAccount}</p>
                </div>
              </div>

              {bill.status === 'Menunggu Konfirmasi' && bill.buktiTransfer && (
                <div className="mt-4">
                  <BuktiTransferReview
                    buktiTransfer={bill.buktiTransfer}
                    onConfirm={() => confirmBatchBill(bill.id)}
                    onReject={() => rejectBatchBill(bill.id)}
                  />
                </div>
              )}

              {bill.status === 'Belum Lunas' && (
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={() => simulateCustomerUploadBatch(bill.id)}
                    className="text-xs text-slate-400 underline hover:text-slate-600"
                    title="Demo helper: simulasikan customer meng-upload bukti transfer (belum ada Customer Dashboard)"
                  >
                    Simulate customer upload (demo)
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {formOpen && (
        <Modal title="Create Batch Bill" onClose={() => setFormOpen(false)} wide>
          <CreateBatchBillForm
            customers={customers}
            items={items}
            existingBillItemIds={existingBillItemIds}
            onSubmit={(input) => {
              createBatchBill(input)
              setFormOpen(false)
            }}
            onCancel={() => setFormOpen(false)}
          />
        </Modal>
      )}
    </div>
  )
}
