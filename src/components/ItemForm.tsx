import { useState } from 'react'
import {
  ORDER_STATUS_OPTIONS,
  TIPE_BARANG_OPTIONS,
  TIPE_KARTU_OPTIONS,
  type Customer,
  type Item,
  type OrderStatus,
  type TipeBarang,
  type TipeKartu,
} from '../types'
import { FileInput } from './FileInput'
import { useStore } from '../store/useStore'

export interface ItemFormValues {
  boxNumber: string
  batchNumber: string
  customerId: string
  tipeBarang: TipeBarang
  tipeKartu?: TipeKartu
  priceJPY: number
  priceIDR: number
  photoDataUrl?: string
  upnotes?: number
  orderStatus: OrderStatus
}

function toFormValues(item?: Item): ItemFormValues {
  return {
    boxNumber: item?.boxNumber ?? '',
    batchNumber: item?.batchNumber ?? '',
    customerId: item?.customerId ?? '',
    tipeBarang: item?.tipeBarang ?? 'Kartu',
    tipeKartu: item?.tipeKartu,
    priceJPY: item?.priceJPY ?? 0,
    priceIDR: item?.priceIDR ?? 0,
    photoDataUrl: item?.photoDataUrl,
    upnotes: item?.upnotes,
    orderStatus: item?.orderStatus ?? 'Menunggu Pembayaran ke Seller',
  }
}

export function ItemForm({
  customers,
  initial,
  onSubmit,
  onCancel,
}: {
  customers: Customer[]
  initial?: Item
  onSubmit: (values: ItemFormValues) => void
  onCancel: () => void
}) {
  const [values, setValues] = useState<ItemFormValues>(toFormValues(initial))
  const [error, setError] = useState<string | null>(null)
  const exchangeRate = useStore((s) => s.estimatorConfig.exchangeRate)

  function set<K extends keyof ItemFormValues>(key: K, value: ItemFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!values.batchNumber.trim()) return setError('Batch number wajib diisi.')
    if (!values.customerId) return setError('Customer wajib dipilih.')
    if (values.tipeBarang === 'Kartu' && !values.tipeKartu) {
      return setError('Tipe Kartu wajib dipilih untuk Tipe Barang = Kartu.')
    }
    if (values.priceJPY <= 0) return setError('Item price (JPY) harus lebih dari 0.')
    setError(null)
    onSubmit({
      ...values,
      tipeKartu: values.tipeBarang === 'Kartu' ? values.tipeKartu : undefined,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Batch Number</label>
          <input
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-rose-400 focus:outline-none focus:ring-1 focus:ring-rose-400"
            value={values.batchNumber}
            onChange={(e) => set('batchNumber', e.target.value)}
            placeholder="BATCH-01"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Box Number <span className="font-normal text-slate-400">(opsional — diisi saat box tiba)</span>
          </label>
          <input
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-rose-400 focus:outline-none focus:ring-1 focus:ring-rose-400"
            value={values.boxNumber}
            onChange={(e) => set('boxNumber', e.target.value)}
            placeholder="BOX-001"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Customer</label>
        <select
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-rose-400 focus:outline-none focus:ring-1 focus:ring-rose-400"
          value={values.customerId}
          onChange={(e) => set('customerId', e.target.value)}
        >
          <option value="">Pilih customer…</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Tipe Barang</label>
          <select
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-rose-400 focus:outline-none focus:ring-1 focus:ring-rose-400"
            value={values.tipeBarang}
            onChange={(e) => set('tipeBarang', e.target.value as TipeBarang)}
          >
            {TIPE_BARANG_OPTIONS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        {values.tipeBarang === 'Kartu' && (
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Tipe Kartu</label>
            <select
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-rose-400 focus:outline-none focus:ring-1 focus:ring-rose-400"
              value={values.tipeKartu ?? ''}
              onChange={(e) => set('tipeKartu', e.target.value as TipeKartu)}
            >
              <option value="">Pilih tipe kartu…</option>
              {TIPE_KARTU_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Item Price (JPY)</label>
          <input
            type="number"
            min={0}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-rose-400 focus:outline-none focus:ring-1 focus:ring-rose-400"
            value={values.priceJPY || ''}
            onChange={(e) => {
              const jpy = Number(e.target.value)
              set('priceJPY', jpy)
              set('priceIDR', Math.round(jpy * exchangeRate))
            }}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Item Price (IDR){' '}
            <span className="font-normal text-slate-400">(auto dari kurs, bisa disesuaikan)</span>
          </label>
          <input
            type="number"
            min={0}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-rose-400 focus:outline-none focus:ring-1 focus:ring-rose-400"
            value={values.priceIDR || ''}
            onChange={(e) => set('priceIDR', Number(e.target.value))}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Upnotes Amount <span className="font-normal text-slate-400">(opsional)</span>
          </label>
          <input
            type="number"
            min={0}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-rose-400 focus:outline-none focus:ring-1 focus:ring-rose-400"
            value={values.upnotes ?? ''}
            onChange={(e) => set('upnotes', e.target.value ? Number(e.target.value) : undefined)}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Order Status</label>
          <select
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-rose-400 focus:outline-none focus:ring-1 focus:ring-rose-400"
            value={values.orderStatus}
            onChange={(e) => set('orderStatus', e.target.value as OrderStatus)}
          >
            {ORDER_STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      <FileInput
        label="Item Photo"
        value={values.photoDataUrl}
        onChange={(dataUrl) => set('photoDataUrl', dataUrl)}
      />

      {error && <p className="text-sm text-rose-600">{error}</p>}

      <div className="mt-2 flex justify-end gap-3">
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
          {initial ? 'Simpan Perubahan' : 'Simpan Item'}
        </button>
      </div>
    </form>
  )
}
