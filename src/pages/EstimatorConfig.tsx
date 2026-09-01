import { useState } from 'react'
import { useStore } from '../store/useStore'
import { calculateEstimate } from '../lib/calc'
import { formatDateTime, formatIDR } from '../lib/format'
import type { ServiceFeeType } from '../types'

export default function EstimatorConfig() {
  const config = useStore((s) => s.estimatorConfig)
  const updateEstimatorConfig = useStore((s) => s.updateEstimatorConfig)

  const [exchangeRate, setExchangeRate] = useState(config.exchangeRate)
  const [serviceFeeType, setServiceFeeType] = useState<ServiceFeeType>(config.serviceFeeType)
  const [serviceFeeValue, setServiceFeeValue] = useState(config.serviceFeeValue)
  const [previewJpy, setPreviewJpy] = useState(1000)
  const [error, setError] = useState<string | null>(null)

  const dirty =
    exchangeRate !== config.exchangeRate ||
    serviceFeeType !== config.serviceFeeType ||
    serviceFeeValue !== config.serviceFeeValue

  const livePreview = calculateEstimate(previewJpy, {
    exchangeRate,
    serviceFeeType,
    serviceFeeValue,
    updatedAt: config.updatedAt,
  })

  function handleSave() {
    if (exchangeRate <= 0) return setError('Exchange rate harus lebih dari 0.')
    if (serviceFeeValue < 0) return setError('Service fee tidak boleh negatif.')
    setError(null)
    updateEstimatorConfig({ exchangeRate, serviceFeeType, serviceFeeValue })
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">D · Price Estimator Configuration</h2>
        <p className="text-sm text-slate-500">
          Kurs JPY → IDR dan service fee di sini langsung dipakai oleh Price Estimator customer, tanpa
          perlu perubahan kode.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-slate-900">Konfigurasi Aktif</h3>
          <div className="mb-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
            <div className="flex justify-between">
              <span>Kurs saat ini</span>
              <span className="font-medium text-slate-900">1 JPY = {formatIDR(config.exchangeRate)}</span>
            </div>
            <div className="flex justify-between">
              <span>Service fee saat ini</span>
              <span className="font-medium text-slate-900">
                {config.serviceFeeType === 'flat'
                  ? formatIDR(config.serviceFeeValue)
                  : `${config.serviceFeeValue}%`}
              </span>
            </div>
            <div className="mt-1 flex justify-between text-xs text-slate-400">
              <span>Terakhir diperbarui</span>
              <span>{formatDateTime(config.updatedAt)}</span>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                JPY → IDR Exchange Rate
              </label>
              <input
                type="number"
                min={0}
                step="0.01"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                value={exchangeRate || ''}
                onChange={(e) => setExchangeRate(Number(e.target.value))}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Service Fee Type</label>
              <div className="flex gap-4 text-sm">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={serviceFeeType === 'flat'}
                    onChange={() => setServiceFeeType('flat')}
                  />
                  Flat (IDR)
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={serviceFeeType === 'percentage'}
                    onChange={() => setServiceFeeType('percentage')}
                  />
                  Percentage (%)
                </label>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Service Fee Value {serviceFeeType === 'percentage' ? '(%)' : '(IDR)'}
              </label>
              <input
                type="number"
                min={0}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                value={serviceFeeValue || ''}
                onChange={(e) => setServiceFeeValue(Number(e.target.value))}
              />
            </div>

            {error && <p className="text-sm text-rose-600">{error}</p>}

            <button
              onClick={handleSave}
              disabled={!dirty}
              className="self-end rounded-md bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              Save Configuration
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-1 text-sm font-semibold text-slate-900">Preview — Customer Price Estimator</h3>
          <p className="mb-4 text-xs text-slate-400">
            Simulasi output yang akan dilihat customer memakai nilai form di sebelah kiri (belum tentu
            tersimpan).
          </p>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Harga item (JPY)</label>
            <input
              type="number"
              min={0}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={previewJpy || ''}
              onChange={(e) => setPreviewJpy(Number(e.target.value))}
            />
          </div>

          <div className="mt-4 space-y-2 rounded-lg bg-slate-50 p-4 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Harga produk</span>
              <span className="text-slate-900">{formatIDR(livePreview.hargaProdukIdr)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Service fee Admin GO</span>
              <span className="text-slate-900">{formatIDR(livePreview.serviceFee)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Estimasi pajak/bea cukai</span>
              <span className="text-slate-900">{formatIDR(livePreview.estimasiPajak)}</span>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-2 font-semibold text-slate-900">
              <span>Total estimasi</span>
              <span>{formatIDR(livePreview.total)}</span>
            </div>
          </div>
          <p className="mt-3 text-xs italic text-slate-400">
            Estimasi ini belum final. Pajak aktual dihitung per box dan dapat berbeda. Belum termasuk
            ongkir domestik.
          </p>
        </div>
      </div>
    </div>
  )
}
