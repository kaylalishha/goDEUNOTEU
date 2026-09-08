import { useState } from 'react'
import { Modal } from './Modal'
import { BOX_NUMBER_PREFIX, extractNumber, formatWithPrefix } from '../lib/numberedId'

export function BulkSetBoxDialog({
  count,
  existingBoxOptions,
  onConfirm,
  onCancel,
}: {
  count: number
  existingBoxOptions: string[]
  onConfirm: (boxNumber: string) => void
  onCancel: () => void
}) {
  const [boxNumberValue, setBoxNumberValue] = useState<number | ''>('')
  const [error, setError] = useState<string | null>(null)

  function pickExisting(box: string) {
    setBoxNumberValue(extractNumber(box, BOX_NUMBER_PREFIX))
    setError(null)
  }

  function handleConfirm() {
    const formatted = formatWithPrefix(BOX_NUMBER_PREFIX, boxNumberValue, 3)
    if (!formatted) {
      setError('Box Number wajib diisi dengan angka.')
      return
    }
    onConfirm(formatted)
  }

  return (
    <Modal title={`Set Box Number — ${count} batch dipilih`} onClose={onCancel}>
      <div className="flex flex-col gap-4">
        <p className="text-sm text-slate-500">
          Box number berikut akan diterapkan ke semua {count} batch yang dicentang, menimpa box
          number yang sudah ada pada batch-batch tersebut.
        </p>

        {existingBoxOptions.length > 0 && (
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-500">
              Pilih box yang sudah ada
            </label>
            <div className="flex flex-wrap gap-1.5">
              {existingBoxOptions.map((box) => (
                <button
                  key={box}
                  type="button"
                  onClick={() => pickExisting(box)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                    extractNumber(box, BOX_NUMBER_PREFIX) === boxNumberValue
                      ? 'border-rose-400 bg-rose-50 text-rose-600'
                      : 'border-slate-300 text-slate-600 hover:border-rose-300 hover:text-rose-600'
                  }`}
                >
                  {box}
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            {existingBoxOptions.length > 0 ? 'Atau isi box baru' : 'Box Number'}{' '}
            <span className="text-rose-500">*</span>
          </label>
          <div className="flex items-stretch gap-2">
            <span className="flex items-center whitespace-nowrap rounded-md border border-slate-300 bg-slate-50 px-3 text-sm font-medium text-slate-500">
              {BOX_NUMBER_PREFIX} -
            </span>
            <input
              type="number"
              min={1}
              step={1}
              autoFocus
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-rose-400 focus:outline-none focus:ring-1 focus:ring-rose-400"
              value={boxNumberValue}
              onChange={(e) => {
                setBoxNumberValue(e.target.value === '' ? '' : Math.trunc(Number(e.target.value)))
                setError(null)
              }}
              placeholder="001"
            />
          </div>
          {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
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
            type="button"
            onClick={handleConfirm}
            className="rounded-md bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700"
          >
            Terapkan ke {count} Batch
          </button>
        </div>
      </div>
    </Modal>
  )
}
