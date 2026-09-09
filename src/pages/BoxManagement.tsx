import { useState } from 'react'
import { useStore } from '../store/useStore'
import { Modal } from '../components/Modal'
import { BoxForm } from '../components/BoxForm'
import { EmptyState } from '../components/EmptyState'
import { formatDate } from '../lib/format'
import { BOX_STATUS_OPTIONS, type Box, type BoxStatus } from '../types'

export default function BoxManagement() {
  const boxes = useStore((s) => s.boxes)
  const batches = useStore((s) => s.batches)
  const saveBox = useStore((s) => s.saveBox)
  const setBoxStatus = useStore((s) => s.setBoxStatus)

  const [formOpen, setFormOpen] = useState(false)
  const [editingBox, setEditingBox] = useState<Box | null>(null)

  const sorted = [...boxes].sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  function batchNumbersFor(box: Box) {
    return box.batchIds
      .map((id) => batches.find((b) => b.id === id)?.batchNumber)
      .filter((n): n is string => Boolean(n))
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">B · Box Management</h2>
          <p className="text-sm text-slate-500">
            Kelompokkan batch ke dalam satu box pengiriman. Sebuah box dikirim sebagai satu
            kesatuan — mengubah status box otomatis memperbarui status semua batch di dalamnya.
          </p>
        </div>
        <button
          onClick={() => setFormOpen(true)}
          className="rounded-md bg-rose-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-rose-700"
        >
          + New Box
        </button>
      </div>

      {sorted.length === 0 ? (
        <EmptyState message="Belum ada box yang dibuat." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Box Number</th>
                <th className="px-4 py-3">Batch(es)</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Created At</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sorted.map((box) => {
                const batchNumbers = batchNumbersFor(box)
                return (
                  <tr key={box.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">{box.boxNumber}</td>
                    <td className="px-4 py-3 text-slate-700">
                      {batchNumbers.length > 0 ? batchNumbers.join(', ') : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={box.status}
                        onChange={(e) => setBoxStatus(box.id, e.target.value as BoxStatus)}
                        className="rounded-md border border-slate-300 px-2 py-1.5 text-xs font-medium text-slate-700 focus:border-rose-400 focus:outline-none focus:ring-1 focus:ring-rose-400"
                      >
                        {BOX_STATUS_OPTIONS.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{formatDate(box.createdAt)}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setEditingBox(box)}
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

      {formOpen && (
        <Modal title="New Box" onClose={() => setFormOpen(false)} wide>
          <BoxForm
            boxes={boxes}
            batches={batches}
            onSubmit={(input) => {
              saveBox(input)
              setFormOpen(false)
            }}
            onCancel={() => setFormOpen(false)}
          />
        </Modal>
      )}

      {editingBox && (
        <Modal title={`Edit Box — ${editingBox.boxNumber}`} onClose={() => setEditingBox(null)} wide>
          <BoxForm
            boxes={boxes}
            batches={batches}
            initial={editingBox}
            onSubmit={(input) => {
              saveBox(input)
              setEditingBox(null)
            }}
            onCancel={() => setEditingBox(null)}
          />
        </Modal>
      )}
    </div>
  )
}
