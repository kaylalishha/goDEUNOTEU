import { useMemo, useState } from 'react'
import type { Customer, Item, TaxBill } from '../types'
import { calculateTaxShares, type TaxCalcItemInput } from '../lib/calc'
import { formatIDR } from '../lib/format'

export function TaxCalculationForm({
  boxOptions,
  itemsByBox,
  customers,
  alreadyPublishedCustomerIds,
  onSaveWeights,
  onPublish,
  onCancel,
}: {
  boxOptions: string[]
  itemsByBox: (boxNumber: string) => Item[]
  customers: Customer[]
  alreadyPublishedCustomerIds: (boxNumber: string) => Set<string>
  onSaveWeights: (weights: Array<{ itemId: string; weightGrams: number }>) => void
  onPublish: (
    bills: Array<Omit<TaxBill, 'id' | 'publishedAt' | 'deadline' | 'status' | 'buktiTransfer'>>,
  ) => void
  onCancel: () => void
}) {
  const [boxNumber, setBoxNumber] = useState('')
  const [totalTax, setTotalTax] = useState<number>(0)
  const [weights, setWeights] = useState<Record<string, number>>({})
  const [error, setError] = useState<string | null>(null)

  const boxItems = boxNumber ? itemsByBox(boxNumber) : []
  const alreadyPublished = boxNumber ? alreadyPublishedCustomerIds(boxNumber) : new Set<string>()
  const eligibleItems = boxItems.filter((i) => !alreadyPublished.has(i.customerId))
  const nonKartuItems = eligibleItems.filter((i) => i.tipeBarang !== 'Kartu')

  function getCustomerName(id: string) {
    return customers.find((c) => c.id === id)?.name ?? 'Unknown'
  }

  const calcInputs: TaxCalcItemInput[] = eligibleItems.map((i) => ({
    customerId: i.customerId,
    isKartu: i.tipeBarang === 'Kartu',
    weightGrams: weights[i.id] ?? i.weightGrams ?? 0,
  }))

  const result = useMemo(
    () => calculateTaxShares(calcInputs, totalTax),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(calcInputs), totalTax],
  )

  function handlePublish() {
    if (!boxNumber) return setError('Pilih box terlebih dahulu.')
    if (totalTax <= 0) return setError('Total tax box harus lebih dari 0.')
    if (nonKartuItems.some((i) => !(weights[i.id] ?? i.weightGrams))) {
      return setError('Isi berat (gram) untuk semua item non-kartu di box ini.')
    }
    if (result.breakdown.length === 0) return setError('Tidak ada customer baru yang bisa dipublikasikan pada box ini.')
    setError(null)

    onSaveWeights(
      nonKartuItems.map((i) => ({ itemId: i.id, weightGrams: weights[i.id] ?? i.weightGrams ?? 0 })),
    )
    onPublish(
      result.breakdown.map((b) => ({
        boxNumber,
        customerId: b.customerId,
        kartuCount: b.kartuCount,
        kartuTax: b.kartuTax,
        nonKartuWeightGrams: b.nonKartuWeightGrams,
        nonKartuShare: b.nonKartuShare,
        total: b.total,
      })),
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Box Number</label>
          <select
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={boxNumber}
            onChange={(e) => setBoxNumber(e.target.value)}
          >
            <option value="">Pilih box…</option>
            {boxOptions.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Total Tax Box (IDR)</label>
          <input
            type="number"
            min={0}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={totalTax || ''}
            onChange={(e) => setTotalTax(Number(e.target.value))}
          />
        </div>
      </div>

      {boxNumber && alreadyPublished.size > 0 && (
        <p className="text-xs text-slate-400">
          {alreadyPublished.size} customer pada box ini sudah memiliki tagihan pajak dan tidak akan
          dipublikasikan ulang.
        </p>
      )}

      {boxNumber && nonKartuItems.length > 0 && (
        <div className="rounded-lg border border-slate-200 p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Berat item non-kartu (gram)
          </p>
          <ul className="space-y-2">
            {nonKartuItems.map((i) => (
              <li key={i.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-slate-700">
                  {getCustomerName(i.customerId)} · {i.tipeBarang}
                </span>
                <input
                  type="number"
                  min={0}
                  className="w-28 rounded-md border border-slate-300 px-2 py-1 text-sm"
                  value={weights[i.id] ?? i.weightGrams ?? ''}
                  onChange={(e) =>
                    setWeights((w) => ({ ...w, [i.id]: Number(e.target.value) }))
                  }
                  placeholder="gram"
                />
              </li>
            ))}
          </ul>
        </div>
      )}

      {boxNumber && result.breakdown.length > 0 && (
        <div className="rounded-lg bg-slate-50 p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Preview Pembagian Pajak per Customer
          </p>
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-slate-400">
              <tr>
                <th className="py-1">Customer</th>
                <th className="py-1">Kartu (flat)</th>
                <th className="py-1">Non-kartu (proporsional)</th>
                <th className="py-1 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {result.breakdown.map((b) => (
                <tr key={b.customerId} className="border-t border-slate-200">
                  <td className="py-1.5 text-slate-700">{getCustomerName(b.customerId)}</td>
                  <td className="py-1.5 text-slate-500">
                    {b.kartuCount > 0 ? `${b.kartuCount}× ${formatIDR(5000)} = ${formatIDR(b.kartuTax)}` : '—'}
                  </td>
                  <td className="py-1.5 text-slate-500">
                    {b.nonKartuWeightGrams > 0
                      ? `${b.nonKartuWeightGrams}g → ${formatIDR(b.nonKartuShare)}`
                      : '—'}
                  </td>
                  <td className="py-1.5 text-right font-semibold text-slate-900">{formatIDR(b.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

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
          type="button"
          onClick={handlePublish}
          className="rounded-md bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700"
        >
          Publish Tax Bill
        </button>
      </div>
    </div>
  )
}
