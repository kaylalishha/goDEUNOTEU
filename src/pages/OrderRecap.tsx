import { useMemo, useState } from 'react'
import { useStore } from '../store/useStore'
import { Modal } from '../components/Modal'
import { BatchForm } from '../components/BatchForm'
import { BatchDetailDialog } from '../components/BatchDetailDialog'
import { formatDate, formatIDR } from '../lib/format'
import type { Batch } from '../types'
import { EmptyState } from '../components/EmptyState'
import type { SaveBatchInput } from '../store/useStore'

export default function OrderRecap() {
  const batches = useStore((s) => s.batches)
  const items = useStore((s) => s.items)
  const customers = useStore((s) => s.customers)
  const getCustomerName = useStore((s) => s.getCustomerName)
  const saveBatch = useStore((s) => s.saveBatch)

  const [boxFilter, setBoxFilter] = useState('')
  const [batchFilter, setBatchFilter] = useState('')
  const [customerFilter, setCustomerFilter] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editingBatch, setEditingBatch] = useState<Batch | null>(null)
  const [viewingBatchId, setViewingBatchId] = useState<string | null>(null)

  const boxOptions = useMemo(
    () => Array.from(new Set(batches.map((b) => b.boxNumber).filter(Boolean))) as string[],
    [batches],
  )
  const batchOptions = useMemo(
    () => Array.from(new Set(batches.map((b) => b.batchNumber))),
    [batches],
  )

  const filtered = batches.filter((b) => {
    if (boxFilter && b.boxNumber !== boxFilter) return false
    if (batchFilter && b.batchNumber !== batchFilter) return false
    if (customerFilter) {
      const hasCustomer = items.some((i) => i.batchId === b.id && i.customerId === customerFilter)
      if (!hasCustomer) return false
    }
    return true
  })
  const sorted = [...filtered].sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  function handleCreate(input: SaveBatchInput) {
    saveBatch(input)
  }

  function handleEdit(input: SaveBatchInput) {
    saveBatch(input)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">A · Order Recap & Batch Payments</h2>
          <p className="text-sm text-slate-500">
            Satu form = satu batch = satu invoice/order link — satu batch bisa berisi order dari
            beberapa customer. Menyimpan batch otomatis menerbitkan tagihan per customer; buka detail
            batch untuk melihat dan mengonfirmasi pembayaran tiap customer di tempat yang sama.
          </p>
        </div>
        <button
          onClick={() => setFormOpen(true)}
          className="rounded-md bg-rose-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-rose-700"
        >
          + New Batch Record
        </button>
      </div>

      <div className="flex flex-wrap items-end gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Box Number</label>
          <select
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
            value={boxFilter}
            onChange={(e) => setBoxFilter(e.target.value)}
          >
            <option value="">Semua Box</option>
            {boxOptions.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Batch Number</label>
          <select
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
            value={batchFilter}
            onChange={(e) => setBatchFilter(e.target.value)}
          >
            <option value="">Semua Batch</option>
            {batchOptions.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Customer</label>
          <select
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
            value={customerFilter}
            onChange={(e) => setCustomerFilter(e.target.value)}
          >
            <option value="">Semua Customer</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        {(boxFilter || batchFilter || customerFilter) && (
          <button
            className="text-xs text-slate-500 underline"
            onClick={() => {
              setBoxFilter('')
              setBatchFilter('')
              setCustomerFilter('')
            }}
          >
            Reset filter
          </button>
        )}
        <span className="ml-auto text-xs text-slate-400">{sorted.length} batch ditemukan</span>
      </div>

      {sorted.length === 0 ? (
        <EmptyState message="Belum ada batch record yang cocok dengan filter ini." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Foto</th>
                <th className="px-4 py-3">Box</th>
                <th className="px-4 py-3">Batch</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Total Item</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Created At</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sorted.map((batch) => {
                const batchItems = items.filter((i) => i.batchId === batch.id)
                const customerIds = new Set(batchItems.map((i) => i.customerId))
                const total = batchItems.reduce((sum, i) => sum + i.priceIDR, 0)
                return (
                  <tr
                    key={batch.id}
                    className="cursor-pointer hover:bg-slate-50"
                    onClick={() => setViewingBatchId(batch.id)}
                  >
                    <td className="px-4 py-3">
                      {batch.photoDataUrls?.[0] ? (
                        <img
                          src={batch.photoDataUrls[0]}
                          alt="batch"
                          className="h-10 w-10 rounded object-cover"
                        />
                      ) : (
                        <span className="text-xs text-slate-400">no photo</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{batch.boxNumber ?? '—'}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">{batch.batchNumber}</td>
                    <td className="px-4 py-3 text-slate-700">
                      {Array.from(customerIds)
                        .map((cid) => getCustomerName(cid))
                        .join(', ') || '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{formatIDR(total)}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                        {batch.orderStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{formatDate(batch.createdAt)}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setEditingBatch(batch)
                        }}
                        className="text-xs font-medium text-rose-600 hover:underline"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-slate-400">
        Data terakhir diperbarui:{' '}
        {batches.length > 0
          ? formatDate(
              batches.reduce((latest, b) => (b.updatedAt > latest ? b.updatedAt : latest), batches[0].updatedAt),
            )
          : '—'}
      </p>

      {formOpen && (
        <Modal title="New Batch Record" onClose={() => setFormOpen(false)} wide>
          <BatchForm customers={customers} onSubmit={handleCreate} onCancel={() => setFormOpen(false)} />
        </Modal>
      )}

      {editingBatch && (
        <Modal title="Edit Batch Record" onClose={() => setEditingBatch(null)} wide>
          <BatchForm
            customers={customers}
            initial={{
              batch: editingBatch,
              items: items.filter((i) => i.batchId === editingBatch.id),
            }}
            onSubmit={handleEdit}
            onCancel={() => setEditingBatch(null)}
          />
        </Modal>
      )}

      {viewingBatchId && (
        <BatchDetailDialog
          batchId={viewingBatchId}
          onClose={() => setViewingBatchId(null)}
          onEdit={() => {
            const b = batches.find((x) => x.id === viewingBatchId)
            if (b) {
              setEditingBatch(b)
              setViewingBatchId(null)
            }
          }}
        />
      )}
    </div>
  )
}
