import { useMemo, useState } from 'react'
import { KARTU_FLAT_TAX_IDR, type Customer, type Item, type TaxBill } from '../types'
import { calculateTaxShares, type TaxCalcItemInput } from '../lib/calc'
import { formatIDR } from '../lib/format'
import { AlertDialog } from './AlertDialog'

// yyyy-mm-dd, +7 days from today — just a starting suggestion for the date
// input, not a rule; Admin can pick any deadline before publishing.
function suggestedDeadlineDate(): string {
  const d = new Date()
  d.setDate(d.getDate() + 7)
  return d.toISOString().slice(0, 10)
}

function itemLabel(i: Item): string {
  return i.tipeBarang === 'Kartu' && i.tipeKartu ? `Kartu ${i.tipeKartu}` : i.tipeBarang
}

const rowKey = (customerId: string, batchId: string) => `${customerId}::${batchId}`

interface BatchRow {
  key: string
  batchId: string
  batchNumber: string
  items: Item[]
  typeCounts: Array<[string, number]>
  calculatedTax: number
  tax: number
  overrideRaw?: string
  invalid: boolean
}

interface CustomerGroup {
  customerId: string
  name: string
  rows: BatchRow[]
  itemCount: number
  total: number
}

export function TaxCalculationForm({
  boxOptions,
  itemsByBox,
  getBatchNumber,
  customers,
  onSaveWeights,
  onPublish,
  onCancel,
}: {
  boxOptions: Array<{ id: string; boxNumber: string; disabledReason?: string }>
  itemsByBox: (boxId: string) => Item[]
  getBatchNumber: (batchId: string) => string
  customers: Customer[]
  onSaveWeights: (weights: Array<{ itemId: string; weightGrams: number }>) => Promise<boolean>
  onPublish: (
    bills: Array<
      Omit<TaxBill, 'id' | 'publishedAt' | 'deadline' | 'status' | 'buktiTransfer' | 'lateFeeIDR'>
    >,
    deadline: string,
  ) => Promise<boolean>
  onCancel: () => void
}) {
  const [boxId, setBoxId] = useState('')
  // Bea Cukai's tax for the non-kartu goods, split across customers by weight.
  const [nonKartuPool, setNonKartuPool] = useState<number>(0)
  const [weights, setWeights] = useState<Record<string, number>>({})
  // Admin's manual tax per customer×batch row, kept as the raw input string
  // so the field can be cleared while typing. Absent = use the calculation.
  const [overrides, setOverrides] = useState<Record<string, string>>({})
  const [deadlineDate, setDeadlineDate] = useState(suggestedDeadlineDate())
  const [dialog, setDialog] = useState<{ tone: 'success' | 'error'; message: string } | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Publish is one-shot per box (only boxes with zero existing tax bills
  // are ever offered here — see boxOptions in TaxBills.tsx), so every item
  // in the box is always eligible, no "already published" filtering.
  const eligibleItems = boxId ? itemsByBox(boxId) : []
  const nonKartuItems = eligibleItems.filter((i) => i.tipeBarang !== 'Kartu')
  const hasNonKartu = nonKartuItems.length > 0

  const weightOf = (i: Item) => weights[i.id] ?? i.weightGrams ?? 0
  const totalNonKartuWeight = nonKartuItems.reduce((s, i) => s + weightOf(i), 0)
  const totalKartuTax = (eligibleItems.length - nonKartuItems.length) * KARTU_FLAT_TAX_IDR
  const pool = hasNonKartu ? nonKartuPool : 0

  function getCustomerName(id: string) {
    return customers.find((c) => c.id === id)?.name ?? 'Unknown'
  }

  const calcInputs: TaxCalcItemInput[] = eligibleItems.map((i) => ({
    customerId: i.customerId,
    isKartu: i.tipeBarang === 'Kartu',
    weightGrams: weightOf(i),
  }))

  const result = useMemo(
    () => calculateTaxShares(calcInputs, totalKartuTax + pool),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(calcInputs), totalKartuTax, pool],
  )

  // Customer → batch → items, mirroring the spreadsheet admins already use.
  const groups: CustomerGroup[] = useMemo(() => {
    const byCustomer = new Map<string, Map<string, Item[]>>()
    for (const i of eligibleItems) {
      const batchesOfCustomer = byCustomer.get(i.customerId) ?? new Map<string, Item[]>()
      batchesOfCustomer.set(i.batchId, [...(batchesOfCustomer.get(i.batchId) ?? []), i])
      byCustomer.set(i.customerId, batchesOfCustomer)
    }
    return [...byCustomer.entries()]
      .map(([customerId, batchMap]) => {
        const rows: BatchRow[] = [...batchMap.entries()]
          .map(([batchId, items]) => {
            const counts = new Map<string, number>()
            for (const i of items) counts.set(i.tipeBarang, (counts.get(i.tipeBarang) ?? 0) + 1)
            const kartuTax = items.filter((i) => i.tipeBarang === 'Kartu').length * KARTU_FLAT_TAX_IDR
            const rowWeight = items.filter((i) => i.tipeBarang !== 'Kartu').reduce((s, i) => s + weightOf(i), 0)
            const nonKartuTax = totalNonKartuWeight > 0 ? (rowWeight / totalNonKartuWeight) * pool : 0
            const calculatedTax = Math.round(kartuTax + nonKartuTax)
            const key = rowKey(customerId, batchId)
            const overrideRaw = overrides[key]
            const parsed = overrideRaw === undefined ? calculatedTax : Number(overrideRaw)
            const invalid = overrideRaw !== undefined && (overrideRaw.trim() === '' || !(parsed >= 0))
            return {
              key,
              batchId,
              batchNumber: getBatchNumber(batchId),
              items,
              typeCounts: [...counts.entries()],
              calculatedTax,
              tax: invalid ? 0 : Math.round(parsed),
              overrideRaw,
              invalid,
            }
          })
          .sort((a, b) => a.batchNumber.localeCompare(b.batchNumber, undefined, { numeric: true }))
        return {
          customerId,
          name: getCustomerName(customerId),
          rows,
          itemCount: rows.reduce((s, r) => s + r.items.length, 0),
          total: rows.reduce((s, r) => s + r.tax, 0),
        }
      })
      .sort((a, b) => a.name.localeCompare(b.name))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(calcInputs), boxId, pool, totalNonKartuWeight, overrides, customers])

  const grandTotal = groups.reduce((s, g) => s + g.total, 0)
  const calculatedGrandTotal = groups.reduce((s, g) => s + g.rows.reduce((t, r) => t + r.calculatedTax, 0), 0)
  const adjustment = grandTotal - calculatedGrandTotal
  const editedCount = groups.reduce((s, g) => s + g.rows.filter((r) => r.overrideRaw !== undefined).length, 0)

  function selectBox(id: string) {
    setBoxId(id)
    setOverrides({})
  }

  function setOverride(key: string, value: string) {
    setOverrides((o) => ({ ...o, [key]: value }))
  }

  function resetOverride(key: string) {
    setOverrides((o) => {
      const next = { ...o }
      delete next[key]
      return next
    })
  }

  async function handlePublish() {
    if (submitting) return
    const fail = (message: string) => setDialog({ tone: 'error', message })
    if (!boxId) return fail('Pilih box terlebih dahulu.')
    if (!deadlineDate) return fail('Pilih deadline pembayaran.')
    if (nonKartuItems.some((i) => !weightOf(i))) {
      return fail('Isi berat (gram) untuk semua item non-kartu di box ini.')
    }
    if (hasNonKartu && pool <= 0) {
      return fail('Isi pajak barang non-kartu dari Bea Cukai.')
    }
    if (groups.some((g) => g.rows.some((r) => r.invalid))) {
      return fail('Ada nominal pajak yang kosong atau tidak valid. Isi angkanya atau klik "Reset".')
    }
    if (groups.length === 0) {
      return fail('Tidak ada customer yang bisa dipublikasikan pada box ini.')
    }
    if (grandTotal <= 0) return fail('Total tax box harus lebih dari 0.')

    // Noon local time, matching the LINE example's "batas pembayaran ...
    // jam 12:00 siang" convention.
    const deadlineIso = new Date(`${deadlineDate}T12:00:00`).toISOString()
    const totalByCustomer = new Map(groups.map((g) => [g.customerId, g.total]))

    // onSaveWeights/onPublish resolve false when the store failed (and
    // already toasted why) — publish only once the weights are saved. If
    // either throws for any other reason, still surface a dialog rather
    // than leaving the sheet open with no feedback.
    setSubmitting(true)
    try {
      const weightsSaved = await onSaveWeights(
        nonKartuItems.map((i) => ({ itemId: i.id, weightGrams: weightOf(i) })),
      )
      // kartuTax/nonKartuShare keep the calculated reference; `total` is
      // what the customer pays, including any admin edits (the customer
      // page labels a differing total as "disesuaikan admin").
      const published = weightsSaved && await onPublish(
        result.breakdown.map((b) => ({
          boxId,
          customerId: b.customerId,
          itemIds: eligibleItems.filter((i) => i.customerId === b.customerId).map((i) => i.id),
          kartuCount: b.kartuCount,
          kartuTax: b.kartuTax,
          nonKartuWeightGrams: b.nonKartuWeightGrams,
          nonKartuShare: b.nonKartuShare,
          total: totalByCustomer.get(b.customerId) ?? Math.round(b.total),
        })),
        deadlineIso,
      )
      setDialog(
        published
          ? {
              tone: 'success',
              message: `Tagihan pajak untuk ${groups.length} customer berhasil dipublikasikan.`,
            }
          : { tone: 'error', message: 'Tagihan pajak belum dipublikasikan — lihat pesan error di pojok kanan bawah.' },
      )
    } catch (err) {
      setDialog({
        tone: 'error',
        message: `Gagal mempublikasikan tagihan pajak: ${err instanceof Error ? err.message : 'terjadi kesalahan tak terduga.'}`,
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Box Number</label>
          <select
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={boxId}
            onChange={(e) => selectBox(e.target.value)}
          >
            <option value="">Pilih box…</option>
            {boxOptions.map((b) => (
              <option key={b.id} value={b.id} disabled={Boolean(b.disabledReason)}>
                {b.disabledReason ? `${b.boxNumber} — ${b.disabledReason}` : b.boxNumber}
              </option>
            ))}
          </select>
          {boxOptions.length === 0 ? (
            <p className="mt-1 text-xs text-slate-500">Belum ada box. Buat box dulu di Box Management.</p>
          ) : (
            boxOptions.every((b) => b.disabledReason) && (
              <p className="mt-1 text-xs text-slate-500">
                Belum ada box yang bisa dipublikasikan. Box harus berstatus Di Bea Cukai / Di WH Indonesia /
                Selesai, berisi batch, dan belum pernah dipublikasikan.
              </p>
            )
          )}
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Deadline Pembayaran</label>
          <input
            type="date"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={deadlineDate}
            onChange={(e) => setDeadlineDate(e.target.value)}
          />
        </div>
        {hasNonKartu && (
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Pajak Barang Non-kartu (IDR)
            </label>
            <input
              type="number"
              min={0}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={nonKartuPool || ''}
              onChange={(e) => setNonKartuPool(Number(e.target.value))}
              placeholder="Dari invoice Bea Cukai"
            />
            <p className="mt-1 text-xs text-slate-500">Dibagi ke customer sesuai berat barang non-kartu.</p>
          </div>
        )}
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Total Tax Box (IDR)</label>
          <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold tabular-nums text-rose-700">
            {formatIDR(grandTotal)}
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Otomatis dari jumlah pajak semua customer di bawah
            {adjustment !== 0 &&
              ` (termasuk penyesuaian ${adjustment > 0 ? '+' : '−'}${formatIDR(Math.abs(adjustment))})`}
            .
          </p>
        </div>
      </div>

      {boxId && groups.length === 0 && (
        <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-500">Box ini belum berisi item.</p>
      )}

      {groups.length > 0 && (
        <section className="flex flex-col gap-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Rincian Pajak per Customer
            </p>
            <p className="text-xs text-slate-500">
              {groups.length} customer · Kartu {formatIDR(KARTU_FLAT_TAX_IDR)}/item
              {editedCount > 0 && ` · ${editedCount} nominal diubah manual`}
            </p>
          </div>

          {groups.map((g) => (
            <div key={g.customerId} className="overflow-hidden rounded-lg border border-slate-200">
              <div className="flex flex-wrap items-center justify-between gap-2 bg-rose-50 px-3 py-2">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{g.name}</p>
                  <p className="text-xs text-slate-500">
                    {g.rows.length} batch · {g.itemCount} item
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] uppercase tracking-wide text-slate-500">Total Tax</p>
                  <p className="text-base font-semibold tabular-nums text-rose-700">{formatIDR(g.total)}</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-400">
                    <tr>
                      <th className="px-3 py-2">Batch</th>
                      <th className="px-3 py-2">Detail Barang</th>
                      <th className="px-3 py-2">Jumlah</th>
                      <th className="px-3 py-2 text-right">Tax</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {g.rows.map((r) => {
                      const edited = r.overrideRaw !== undefined
                      return (
                        <tr key={r.key}>
                          <td className="whitespace-nowrap px-3 py-2 align-top font-semibold text-rose-600">
                            {r.batchNumber}
                          </td>
                          <td className="px-3 py-2 align-top text-slate-700">
                            <ul className="space-y-1">
                              {r.items.map((i) => {
                                const isKartu = i.tipeBarang === 'Kartu'
                                const missingWeight = !isKartu && !weightOf(i)
                                return (
                                  <li key={i.id} className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">
                                      {itemLabel(i)}
                                    </span>
                                    <span>{i.description || <span className="text-slate-400">—</span>}</span>
                                    {!isKartu && (
                                      <span className="flex items-center gap-1">
                                        <input
                                          type="number"
                                          min={0}
                                          aria-label={`Berat ${itemLabel(i)} (gram)`}
                                          className={`w-20 rounded-md border px-2 py-0.5 text-xs ${
                                            missingWeight ? 'border-rose-400 bg-rose-50' : 'border-slate-300'
                                          }`}
                                          value={weights[i.id] ?? i.weightGrams ?? ''}
                                          onChange={(e) =>
                                            setWeights((w) => ({ ...w, [i.id]: Number(e.target.value) }))
                                          }
                                          placeholder="berat"
                                        />
                                        <span className="text-xs text-slate-400">g</span>
                                      </span>
                                    )}
                                  </li>
                                )
                              })}
                            </ul>
                          </td>
                          <td className="whitespace-nowrap px-3 py-2 align-top text-slate-600">
                            {r.typeCounts.map(([type, n]) => (
                              <div key={type}>
                                {n} {type}
                              </div>
                            ))}
                          </td>
                          <td className="px-3 py-2 align-top text-right">
                            <div className="flex items-center justify-end gap-1">
                              <span className="text-xs text-slate-400">Rp</span>
                              <input
                                type="number"
                                min={0}
                                aria-label={`Pajak ${g.name} batch ${r.batchNumber}`}
                                className={`w-28 rounded-md border px-2 py-1 text-right text-sm tabular-nums ${
                                  r.invalid
                                    ? 'border-rose-400 bg-rose-50'
                                    : edited
                                      ? 'border-amber-400 bg-amber-50'
                                      : 'border-slate-300'
                                }`}
                                value={edited ? r.overrideRaw : r.calculatedTax}
                                onChange={(e) => setOverride(r.key, e.target.value)}
                              />
                            </div>
                            {edited && (
                              <div className="mt-1 text-xs text-slate-500">
                                Hitungan: {formatIDR(r.calculatedTax)} ·{' '}
                                <button
                                  type="button"
                                  onClick={() => resetOverride(r.key)}
                                  className="text-rose-600 underline hover:text-rose-700"
                                >
                                  Reset
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </section>
      )}

      <div className="mt-1 flex flex-wrap items-center justify-end gap-3">
        {groups.length > 0 && (
          <p className="mr-auto text-sm text-slate-600">
            Total box: <span className="font-semibold tabular-nums text-slate-900">{formatIDR(grandTotal)}</span>
          </p>
        )}
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
          disabled={submitting}
          className="rounded-md bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {submitting ? 'Mempublikasikan…' : 'Publish Tax Bill'}
        </button>
      </div>

      {dialog && (
        <AlertDialog
          tone={dialog.tone}
          title={dialog.tone === 'success' ? 'Berhasil' : 'Gagal Mempublikasikan'}
          message={dialog.message}
          onClose={() => {
            const wasSuccess = dialog.tone === 'success'
            setDialog(null)
            if (wasSuccess) onCancel()
          }}
        />
      )}
    </div>
  )
}
