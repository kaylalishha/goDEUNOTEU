import { useMemo, useState } from 'react'
import type { Batch, Customer, Item } from '../types'
import { formatIDR } from '../lib/format'

const DEFAULT_BANK_ACCOUNT = 'BCA 1234567890 a.n. Admin GO Aikatsu'

export function CreateBatchBillForm({
  customers,
  batches,
  items,
  existingBillItemIds,
  onSubmit,
  onCancel,
}: {
  customers: Customer[]
  batches: Batch[]
  items: Item[]
  existingBillItemIds: Set<string>
  onSubmit: (input: {
    batchId: string
    customerId: string
    batchNumber: string
    itemIds: string[]
    upnotesTotal: number
    bankAccount: string
  }) => void
  onCancel: () => void
}) {
  const [customerId, setCustomerId] = useState('')
  const [batchId, setBatchId] = useState('')
  const [upnotesTotal, setUpnotesTotal] = useState(0)
  const [bankAccount, setBankAccount] = useState(DEFAULT_BANK_ACCOUNT)
  const [error, setError] = useState<string | null>(null)

  const batchOptionsForCustomer = useMemo(() => {
    if (!customerId) return []
    const batchIds = new Set(
      items.filter((i) => i.customerId === customerId).map((i) => i.batchId),
    )
    return batches.filter((b) => batchIds.has(b.id))
  }, [items, batches, customerId])

  const selectedBatch = batches.find((b) => b.id === batchId)

  const availableItems = useMemo(() => {
    if (!customerId || !batchId) return []
    return items.filter(
      (i) => i.customerId === customerId && i.batchId === batchId && !existingBillItemIds.has(i.id),
    )
  }, [items, customerId, batchId, existingBillItemIds])

  const itemTotal = availableItems.reduce((sum, i) => sum + i.priceIDR, 0)
  const total = itemTotal + upnotesTotal

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!customerId) return setError('Pilih customer terlebih dahulu.')
    if (!selectedBatch) return setError('Pilih batch.')
    if (availableItems.length === 0) return setError('Tidak ada item yang bisa ditagihkan pada batch ini.')
    if (!bankAccount.trim()) return setError('Informasi rekening bank wajib diisi.')
    setError(null)
    onSubmit({
      batchId: selectedBatch.id,
      customerId,
      batchNumber: selectedBatch.batchNumber,
      itemIds: availableItems.map((i) => i.id),
      upnotesTotal,
      bankAccount,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Customer</label>
          <select
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={customerId}
            onChange={(e) => {
              setCustomerId(e.target.value)
              setBatchId('')
            }}
          >
            <option value="">Pilih customer…</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Batch Number</label>
          <select
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={batchId}
            onChange={(e) => setBatchId(e.target.value)}
            disabled={!customerId}
          >
            <option value="">Pilih batch…</option>
            {batchOptionsForCustomer.map((b) => (
              <option key={b.id} value={b.id}>
                {b.batchNumber}{b.boxNumber ? ` · Box ${b.boxNumber}` : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {customerId && batchId && (
        <div className="rounded-lg border border-slate-200 p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Item pada batch ini (auto-populated)
          </p>
          {availableItems.length === 0 ? (
            <p className="text-sm text-slate-500">
              Semua item pada batch ini sudah memiliki tagihan, atau belum ada item tercatat.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100 text-sm">
              {availableItems.map((i) => (
                <li key={i.id} className="flex items-center justify-between py-1.5">
                  <span className="text-slate-700">
                    {i.tipeBarang}
                    {i.tipeKartu ? ` · ${i.tipeKartu}` : ''}
                  </span>
                  <span className="text-slate-500">{formatIDR(i.priceIDR)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Upnotes Amount <span className="font-normal text-slate-400">(bagian customer ini, opsional)</span>
        </label>
        <input
          type="number"
          min={0}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          value={upnotesTotal || ''}
          onChange={(e) => setUpnotesTotal(Number(e.target.value))}
        />
        <p className="mt-1 text-xs text-slate-400">
          Hitung manual dari subtotal item customer ini ({formatIDR(itemTotal)}) — upnotes tidak lagi
          direkap di level batch.
        </p>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Bank Account (untuk transfer)</label>
        <input
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          value={bankAccount}
          onChange={(e) => setBankAccount(e.target.value)}
        />
      </div>

      <div className="rounded-lg bg-slate-50 p-3 text-sm">
        <div className="flex justify-between text-slate-500">
          <span>Subtotal item</span>
          <span>{formatIDR(itemTotal)}</span>
        </div>
        <div className="flex justify-between text-slate-500">
          <span>Upnotes</span>
          <span>{formatIDR(upnotesTotal)}</span>
        </div>
        <div className="mt-1 flex justify-between border-t border-slate-200 pt-1 font-semibold text-slate-900">
          <span>Total Tagihan</span>
          <span>{formatIDR(total)}</span>
        </div>
      </div>

      {error && <p className="text-sm text-rose-600">{error}</p>}

      <div className="mt-1 flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Batal
        </button>
        <button
          type="submit"
          className="rounded-md bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700"
        >
          Terbitkan Tagihan Batch
        </button>
      </div>
    </form>
  )
}
