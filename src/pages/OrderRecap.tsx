import { useMemo, useState } from 'react'
import { useStore } from '../store/useStore'
import { Modal } from '../components/Modal'
import { ItemForm, type ItemFormValues } from '../components/ItemForm'
import { formatDate, formatIDR, formatJPY } from '../lib/format'
import type { Item } from '../types'
import { EmptyState } from '../components/EmptyState'

export default function OrderRecap() {
  const items = useStore((s) => s.items)
  const customers = useStore((s) => s.customers)
  const getCustomerName = useStore((s) => s.getCustomerName)
  const addItem = useStore((s) => s.addItem)
  const updateItem = useStore((s) => s.updateItem)

  const [boxFilter, setBoxFilter] = useState('')
  const [batchFilter, setBatchFilter] = useState('')
  const [customerFilter, setCustomerFilter] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Item | null>(null)

  const boxOptions = useMemo(
    () => Array.from(new Set(items.map((i) => i.boxNumber).filter(Boolean))) as string[],
    [items],
  )
  const batchOptions = useMemo(
    () => Array.from(new Set(items.map((i) => i.batchNumber))),
    [items],
  )

  const filtered = items.filter((it) => {
    if (boxFilter && it.boxNumber !== boxFilter) return false
    if (batchFilter && it.batchNumber !== batchFilter) return false
    if (customerFilter && it.customerId !== customerFilter) return false
    return true
  })

  function handleCreate(values: ItemFormValues) {
    addItem({
      boxNumber: values.boxNumber || undefined,
      batchNumber: values.batchNumber,
      customerId: values.customerId,
      tipeBarang: values.tipeBarang,
      tipeKartu: values.tipeKartu,
      priceJPY: values.priceJPY,
      priceIDR: values.priceIDR,
      photoDataUrl: values.photoDataUrl,
      upnotes: values.upnotes,
      orderStatus: values.orderStatus,
    })
    setFormOpen(false)
  }

  function handleEdit(values: ItemFormValues) {
    if (!editingItem) return
    updateItem(editingItem.id, {
      boxNumber: values.boxNumber || undefined,
      batchNumber: values.batchNumber,
      customerId: values.customerId,
      tipeBarang: values.tipeBarang,
      tipeKartu: values.tipeKartu,
      priceJPY: values.priceJPY,
      priceIDR: values.priceIDR,
      photoDataUrl: values.photoDataUrl,
      upnotes: values.upnotes,
      orderStatus: values.orderStatus,
    })
    setEditingItem(null)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">A · Standardized Order Recap Form</h2>
          <p className="text-sm text-slate-500">
            Satu form untuk semua data item — foto dan upnotes langsung menempel ke record, tidak lagi
            terpisah di Google Sheets / LINE Notes.
          </p>
        </div>
        <button
          onClick={() => setFormOpen(true)}
          className="rounded-md bg-rose-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-rose-700"
        >
          + New Item Record
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
        <span className="ml-auto text-xs text-slate-400">{filtered.length} record ditemukan</span>
      </div>

      {filtered.length === 0 ? (
        <EmptyState message="Belum ada item record yang cocok dengan filter ini." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Box</th>
                <th className="px-4 py-3">Batch</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Foto</th>
                <th className="px-4 py-3">Tipe Barang</th>
                <th className="px-4 py-3">Tipe Kartu</th>
                <th className="px-4 py-3">Harga (JPY)</th>
                <th className="px-4 py-3">Harga (IDR)</th>
                <th className="px-4 py-3">Upnotes</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((it) => (
                <tr key={it.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-500">{it.boxNumber ?? '—'}</td>
                  <td className="px-4 py-3 font-medium text-slate-900">{it.batchNumber}</td>
                  <td className="px-4 py-3 text-slate-700">{getCustomerName(it.customerId)}</td>
                  <td className="px-4 py-3">
                    {it.photoDataUrl ? (
                      <img src={it.photoDataUrl} alt="item" className="h-10 w-10 rounded object-cover" />
                    ) : (
                      <span className="text-xs text-slate-400">no photo</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{it.tipeBarang}</td>
                  <td className="px-4 py-3 text-slate-500">{it.tipeKartu ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-700">{formatJPY(it.priceJPY)}</td>
                  <td className="px-4 py-3 text-slate-700">{formatIDR(it.priceIDR)}</td>
                  <td className="px-4 py-3 text-slate-500">{it.upnotes ? formatIDR(it.upnotes) : '—'}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                      {it.orderStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setEditingItem(it)}
                      className="text-xs font-medium text-rose-600 hover:underline"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-slate-400">
        Data terakhir diperbarui: {items[0] ? formatDate(items[0].updatedAt) : '—'}
      </p>

      {formOpen && (
        <Modal title="New Item Record" onClose={() => setFormOpen(false)} wide>
          <ItemForm customers={customers} onSubmit={handleCreate} onCancel={() => setFormOpen(false)} />
        </Modal>
      )}

      {editingItem && (
        <Modal title="Edit Item Record" onClose={() => setEditingItem(null)} wide>
          <ItemForm
            customers={customers}
            initial={editingItem}
            onSubmit={handleEdit}
            onCancel={() => setEditingItem(null)}
          />
        </Modal>
      )}
    </div>
  )
}
