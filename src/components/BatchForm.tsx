import { useState } from 'react'
import {
  ORDER_STATUS_OPTIONS,
  ORDER_TYPE_OPTIONS,
  TIPE_BARANG_OPTIONS,
  TIPE_KARTU_OPTIONS,
  type Batch,
  type Customer,
  type Item,
  type OrderStatus,
  type OrderType,
  type TipeBarang,
  type TipeKartu,
} from '../types'
import { FileInput } from './FileInput'
import { AlertDialog } from './AlertDialog'
import { makeId } from '../lib/id'
import { formatIDR } from '../lib/format'
import type { SaveBatchInput } from '../store/useStore'

interface ItemRow {
  localId: string
  id?: string
  tipeBarang: TipeBarang
  tipeKartu?: TipeKartu
  priceIDR: number
}

interface CustomerOrderRow {
  localId: string
  customerId: string
  items: ItemRow[]
}

function emptyItemRow(): ItemRow {
  return { localId: makeId('row'), tipeBarang: 'Kartu', priceIDR: 0 }
}

function emptyCustomerOrder(): CustomerOrderRow {
  return { localId: makeId('order'), customerId: '', items: [emptyItemRow()] }
}

function toCustomerOrders(items: Item[]): CustomerOrderRow[] {
  const byCustomer = new Map<string, ItemRow[]>()
  for (const it of items) {
    const row: ItemRow = {
      localId: makeId('row'),
      id: it.id,
      tipeBarang: it.tipeBarang,
      tipeKartu: it.tipeKartu,
      priceIDR: it.priceIDR,
    }
    byCustomer.set(it.customerId, [...(byCustomer.get(it.customerId) ?? []), row])
  }
  return Array.from(byCustomer.entries()).map(([customerId, items]) => ({
    localId: makeId('order'),
    customerId,
    items,
  }))
}

export function BatchForm({
  customers,
  initial,
  onSubmit,
  onCancel,
}: {
  customers: Customer[]
  initial?: { batch: Batch; items: Item[] }
  onSubmit: (input: SaveBatchInput) => void
  onCancel: () => void
}) {
  const [batchNumber, setBatchNumber] = useState(initial?.batch.batchNumber ?? '')
  const [boxNumber, setBoxNumber] = useState(initial?.batch.boxNumber ?? '')
  const [orderType, setOrderType] = useState<OrderType>(initial?.batch.orderType ?? 'ReqShare')
  const [photoDataUrl, setPhotoDataUrl] = useState(initial?.batch.photoDataUrl)
  const [orderStatus, setOrderStatus] = useState<OrderStatus>(
    initial?.batch.orderStatus ?? 'Menunggu Pembayaran ke Seller',
  )
  const [customerOrders, setCustomerOrders] = useState<CustomerOrderRow[]>(
    initial ? toCustomerOrders(initial.items) : [emptyCustomerOrder()],
  )
  const [dialog, setDialog] = useState<{ tone: 'success' | 'error'; message: string } | null>(null)

  function updateOrder(localId: string, patch: Partial<CustomerOrderRow>) {
    setCustomerOrders((rows) => rows.map((r) => (r.localId === localId ? { ...r, ...patch } : r)))
  }

  function updateItem(orderLocalId: string, itemLocalId: string, patch: Partial<ItemRow>) {
    setCustomerOrders((rows) =>
      rows.map((r) =>
        r.localId !== orderLocalId
          ? r
          : {
              ...r,
              items: r.items.map((it) => (it.localId === itemLocalId ? { ...it, ...patch } : it)),
            },
      ),
    )
  }

  function addCustomerOrder() {
    setCustomerOrders((rows) => [...rows, emptyCustomerOrder()])
  }

  function removeCustomerOrder(localId: string) {
    setCustomerOrders((rows) => rows.filter((r) => r.localId !== localId))
  }

  function addItem(orderLocalId: string) {
    setCustomerOrders((rows) =>
      rows.map((r) =>
        r.localId === orderLocalId ? { ...r, items: [...r.items, emptyItemRow()] } : r,
      ),
    )
  }

  function removeItem(orderLocalId: string, itemLocalId: string) {
    setCustomerOrders((rows) =>
      rows.map((r) =>
        r.localId === orderLocalId
          ? { ...r, items: r.items.filter((it) => it.localId !== itemLocalId) }
          : r,
      ),
    )
  }

  const usedCustomerIds = new Set(customerOrders.map((r) => r.customerId).filter(Boolean))

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const fail = (message: string) => setDialog({ tone: 'error', message })
    if (!batchNumber.trim()) return fail('Batch Name wajib diisi.')
    if (customerOrders.length === 0) return fail('Tambahkan minimal satu customer.')
    for (const order of customerOrders) {
      if (!order.customerId) return fail('Setiap bagian customer wajib memilih customer.')
      if (order.items.length === 0) {
        return fail('Setiap customer wajib memiliki minimal satu item.')
      }
      for (const it of order.items) {
        if (it.tipeBarang === 'Kartu' && !it.tipeKartu) {
          return fail('Tipe Kartu wajib dipilih untuk item bertipe Kartu.')
        }
        if (it.priceIDR <= 0) return fail('Harga item (IDR) harus lebih dari 0.')
      }
    }
    const ids = customerOrders.map((r) => r.customerId)
    if (new Set(ids).size !== ids.length) {
      return fail('Satu customer hanya boleh muncul sekali per batch — gabungkan itemnya.')
    }

    onSubmit({
      batchId: initial?.batch.id,
      batchNumber,
      boxNumber: boxNumber.trim() || undefined,
      orderType,
      photoDataUrl,
      orderStatus,
      customerOrders: customerOrders.map((order) => ({
        customerId: order.customerId,
        items: order.items.map((it) => ({
          id: it.id,
          tipeBarang: it.tipeBarang,
          tipeKartu: it.tipeBarang === 'Kartu' ? it.tipeKartu : undefined,
          priceIDR: it.priceIDR,
        })),
      })),
    })

    setDialog({
      tone: 'success',
      message: initial ? 'Perubahan batch berhasil disimpan.' : 'Batch record baru berhasil disimpan.',
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
          1 · Batch Information
        </p>
        <div className="grid grid-cols-2 gap-4 rounded-lg border border-slate-200 p-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Batch Name / Number <span className="text-rose-500">*</span>
            </label>
            <input
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-rose-400 focus:outline-none focus:ring-1 focus:ring-rose-400"
              value={batchNumber}
              onChange={(e) => setBatchNumber(e.target.value)}
              placeholder="BATCH-01"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Box Number <span className="font-normal text-slate-400">(opsional — bisa diisi nanti)</span>
            </label>
            <input
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-rose-400 focus:outline-none focus:ring-1 focus:ring-rose-400"
              value={boxNumber}
              onChange={(e) => setBoxNumber(e.target.value)}
              placeholder="BOX-001"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Order Type</label>
            <select
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-rose-400 focus:outline-none focus:ring-1 focus:ring-rose-400"
              value={orderType}
              onChange={(e) => setOrderType(e.target.value as OrderType)}
            >
              {ORDER_TYPE_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Order Status</label>
            <select
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-rose-400 focus:outline-none focus:ring-1 focus:ring-rose-400"
              value={orderStatus}
              onChange={(e) => setOrderStatus(e.target.value as OrderStatus)}
            >
              {ORDER_STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="col-span-2">
            <FileInput label="Item Photo" value={photoDataUrl} onChange={setPhotoDataUrl} />
          </div>
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            2 · Per-Customer Orders
          </p>
          <button
            type="button"
            onClick={addCustomerOrder}
            className="text-xs font-medium text-rose-600 hover:underline"
          >
            + Add Customer
          </button>
        </div>

        <div className="flex flex-col gap-4">
          {customerOrders.map((order) => (
            <div key={order.localId} className="rounded-lg border border-slate-200 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <select
                  className="w-full max-w-xs rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-rose-400 focus:outline-none focus:ring-1 focus:ring-rose-400"
                  value={order.customerId}
                  onChange={(e) => updateOrder(order.localId, { customerId: e.target.value })}
                >
                  <option value="">Pilih customer…</option>
                  {customers.map((c) => (
                    <option
                      key={c.id}
                      value={c.id}
                      disabled={usedCustomerIds.has(c.id) && c.id !== order.customerId}
                    >
                      {c.name}
                    </option>
                  ))}
                </select>
                {customerOrders.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeCustomerOrder(order.localId)}
                    className="text-xs text-rose-600 hover:underline"
                  >
                    Remove customer
                  </button>
                )}
              </div>

              <div className="flex flex-col gap-2">
                {order.items.map((it) => (
                  <div
                    key={it.localId}
                    className="grid grid-cols-12 items-end gap-2 rounded-md bg-slate-50 p-2"
                  >
                    <div className="col-span-4">
                      <label className="mb-1 block text-xs text-slate-500">Tipe Barang</label>
                      <select
                        className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                        value={it.tipeBarang}
                        onChange={(e) =>
                          updateItem(order.localId, it.localId, {
                            tipeBarang: e.target.value as TipeBarang,
                          })
                        }
                      >
                        {TIPE_BARANG_OPTIONS.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-4">
                      {it.tipeBarang === 'Kartu' && (
                        <>
                          <label className="mb-1 block text-xs text-slate-500">Tipe Kartu</label>
                          <select
                            className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                            value={it.tipeKartu ?? ''}
                            onChange={(e) =>
                              updateItem(order.localId, it.localId, {
                                tipeKartu: e.target.value as TipeKartu,
                              })
                            }
                          >
                            <option value="">Pilih…</option>
                            {TIPE_KARTU_OPTIONS.map((t) => (
                              <option key={t} value={t}>
                                {t}
                              </option>
                            ))}
                          </select>
                        </>
                      )}
                    </div>
                    <div className="col-span-3">
                      <label className="mb-1 block text-xs text-slate-500">Harga (IDR)</label>
                      <input
                        type="number"
                        min={0}
                        className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                        value={it.priceIDR || ''}
                        onChange={(e) =>
                          updateItem(order.localId, it.localId, { priceIDR: Number(e.target.value) })
                        }
                      />
                    </div>
                    <div className="col-span-1 flex justify-end">
                      {order.items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeItem(order.localId, it.localId)}
                          className="text-xs text-rose-600 hover:underline"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => addItem(order.localId)}
                  className="text-xs font-medium text-rose-600 hover:underline"
                >
                  + Add Item
                </button>
                <span className="text-xs text-slate-400">
                  Subtotal: {formatIDR(order.items.reduce((sum, it) => sum + (it.priceIDR || 0), 0))}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-1 flex justify-end gap-3 border-t border-slate-200 pt-4">
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
          {initial ? 'Simpan Perubahan' : 'Simpan Batch'}
        </button>
      </div>

      {dialog && (
        <AlertDialog
          tone={dialog.tone}
          title={dialog.tone === 'success' ? 'Berhasil' : 'Gagal Menyimpan'}
          message={dialog.message}
          onClose={() => {
            const wasSuccess = dialog.tone === 'success'
            setDialog(null)
            if (wasSuccess) onCancel()
          }}
        />
      )}
    </form>
  )
}
