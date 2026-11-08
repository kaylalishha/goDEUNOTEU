import { useState } from 'react'
import { BackLink, Card, PageHeader } from '../components/ui'
import { calculateEstimate } from '../shared/calc'
import { formatDate, formatIDR, formatJPY } from '../shared/format'
import { useStore } from '../store'

// Customer Feature 3 — Kalkulator Harga (FR-GO-3-001 … FR-GO-3-005).
// Uses the admin's calculateEstimate() and saved estimator settings, so the
// customer total always equals the admin's preview for the same yen price.
export default function Kalkulator() {
  const config = useStore((s) => s.estimatorConfig)
  const [raw, setRaw] = useState('')
  const digits = raw.replace(/\D/g, '')
  const priceJpy = digits ? Number(digits) : null
  const est = priceJpy !== null ? calculateEstimate(priceJpy, config) : null

  return (
    <div className="flex flex-col gap-5">
      <BackLink to="/id?tab=order" label="Layanan Pesanan" />
      <PageHeader title="Kalkulator Harga" description="Estimasi harga barang dari Jepang sebelum kamu ikut order." />

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <Card>
          <div className="mb-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
            <div className="flex justify-between">
              <span>Kurs aktif</span>
              <span className="font-medium text-slate-900">¥1 = {formatIDR(config.exchangeRate)}</span>
            </div>
            <div className="flex justify-between">
              <span>Service fee</span>
              <span className="font-medium text-slate-900">
                {config.serviceFeeType === 'flat' ? formatIDR(config.serviceFeeValue) : `${config.serviceFeeValue}%`}
              </span>
            </div>
            <div className="mt-1 flex justify-between text-xs text-slate-400">
              <span>Terakhir diperbarui</span>
              <span>{formatDate(config.updatedAt)}</span>
            </div>
          </div>

          <label htmlFor="price-jpy" className="mb-1 block text-sm font-medium text-slate-700">
            Harga barang (JPY)
          </label>
          <div className="flex items-center rounded-md border border-slate-300 focus-within:border-rose-400 focus-within:ring-1 focus-within:ring-rose-400">
            <span className="pl-3 text-sm text-slate-400">¥</span>
            <input
              id="price-jpy"
              inputMode="numeric"
              autoComplete="off"
              placeholder="contoh: 1000"
              value={digits ? Number(digits).toLocaleString('id-ID') : ''}
              onChange={(e) => setRaw(e.target.value)}
              className="w-full rounded-md px-2 py-2 text-sm outline-none"
            />
          </div>
          <p className="mt-1 text-xs text-slate-400">Harga per barang dalam yen, tanpa ongkir lokal dari seller.</p>
        </Card>

        <Card>
          <h3 className="text-sm font-semibold text-slate-900">Estimasi harga</h3>
          {est ? (
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-500">Harga produk ({formatJPY(priceJpy!)})</dt>
                <dd className="text-slate-900 tabular-nums">{formatIDR(est.hargaProdukIdr)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Service fee Admin GO</dt>
                <dd className="text-slate-900 tabular-nums">{formatIDR(est.serviceFee)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Estimasi pajak/bea cukai</dt>
                <dd className="text-slate-900 tabular-nums">{formatIDR(est.estimasiPajak)}</dd>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-2 font-semibold text-slate-900">
                <dt>Total estimasi</dt>
                <dd className="text-rose-600 tabular-nums">{formatIDR(est.total)}</dd>
              </div>
            </dl>
          ) : (
            <p className="mt-3 text-2xl font-bold text-slate-300">Rp —</p>
          )}
          {!est && <p className="mt-1 text-sm text-slate-500">Masukkan harga barang dalam yen untuk melihat estimasinya.</p>}
          <p className="mt-4 text-xs text-slate-400 italic">
            Estimasi ini belum final. Pajak aktual dihitung per box setelah bea cukai dan bisa berbeda. Belum termasuk ongkir
            domestik. Hubungi admin untuk harga pasti.
          </p>
        </Card>
      </div>
    </div>
  )
}
