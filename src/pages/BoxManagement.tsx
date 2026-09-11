import { useEffect, useRef, useState } from 'react'
import { useStore } from '../store/useStore'
import { Modal } from '../components/Modal'
import { AlertDialog } from '../components/AlertDialog'
import { BoxForm } from '../components/BoxForm'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { EmptyState } from '../components/EmptyState'
import { PAGE_SIZE, Pagination } from '../components/Pagination'
import { guardBoxDeletion } from '../lib/deleteGuards'
import { formatDate } from '../lib/format'
import type { Box } from '../types'

export default function BoxManagement() {
  const boxes = useStore((s) => s.boxes)
  const batches = useStore((s) => s.batches)
  const taxBills = useStore((s) => s.taxBills)
  const saveBox = useStore((s) => s.saveBox)
  const deleteBoxes = useStore((s) => s.deleteBoxes)

  const [formOpen, setFormOpen] = useState(false)
  const [viewingBox, setViewingBox] = useState<Box | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false)
  const [nothingToDeleteOpen, setNothingToDeleteOpen] = useState(false)
  const [page, setPage] = useState(1)
  const selectAllRef = useRef<HTMLInputElement>(null)

  const sorted = [...boxes].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageItems = sorted.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  const selectedInView = pageItems.filter((b) => selectedIds.has(b.id)).length
  const allInViewSelected = pageItems.length > 0 && selectedInView === pageItems.length

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = selectedInView > 0 && !allInViewSelected
    }
  }, [selectedInView, allInViewSelected])

  function batchNumbersFor(box: Box) {
    return box.batchIds
      .map((id) => batches.find((b) => b.id === id)?.batchNumber)
      .filter((n): n is string => Boolean(n))
  }

  function toggleSelected(boxId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(boxId)) next.delete(boxId)
      else next.add(boxId)
      return next
    })
  }

  function handleSelectAllToggle() {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (allInViewSelected) {
        pageItems.forEach((b) => next.delete(b.id))
      } else {
        pageItems.forEach((b) => next.add(b.id))
      }
      return next
    })
  }

  function handleDeleteClick() {
    if (eligibleBoxesToDelete.length === 0) {
      setNothingToDeleteOpen(true)
    } else {
      setBulkDeleteConfirmOpen(true)
    }
  }

  function handleBulkDeleteConfirm() {
    deleteBoxes(Array.from(selectedIds))
    setSelectedIds(new Set())
    setBulkDeleteConfirmOpen(false)
  }

  const selectedBoxesForDelete = boxes.filter((b) => selectedIds.has(b.id))
  const { eligible: eligibleBoxesToDelete, blocked: blockedBoxesToDelete } = guardBoxDeletion(
    selectedBoxesForDelete,
    taxBills,
  )
  const affectedBatchCount = eligibleBoxesToDelete.reduce((sum, b) => sum + b.batchIds.length, 0)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">B · Box Management</h2>
          <p className="text-sm text-slate-500">
            Kelompokkan batch ke dalam satu box pengiriman. Sebuah box dikirim sebagai satu
            kesatuan — mengubah status box otomatis memperbarui status semua batch di dalamnya.
            Klik sebuah box untuk melihat dan mengedit detailnya.
          </p>
        </div>
        <button
          onClick={() => setFormOpen(true)}
          className="rounded-md bg-rose-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-rose-700"
        >
          + New Box
        </button>
      </div>

      {selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
          <span className="text-sm font-medium text-rose-700">{selectedIds.size} box dipilih</span>
          <div className="flex items-center gap-4">
            <button
              onClick={handleDeleteClick}
              className="rounded-md border border-rose-300 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100"
            >
              Delete
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-xs font-medium text-rose-600 hover:underline"
            >
              Batalkan pilihan
            </button>
          </div>
        </div>
      )}

      {sorted.length === 0 ? (
        <EmptyState message="Belum ada box yang dibuat." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="w-10 px-4 py-3">
                  <input
                    ref={selectAllRef}
                    type="checkbox"
                    checked={allInViewSelected}
                    onChange={handleSelectAllToggle}
                    aria-label="Pilih semua box yang tampil"
                    className="h-4 w-4 rounded border-slate-300 text-rose-600 focus:ring-rose-400"
                  />
                </th>
                <th className="px-4 py-3">Box Number</th>
                <th className="px-4 py-3">Batch(es)</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Created At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pageItems.map((box) => {
                const batchNumbers = batchNumbersFor(box)
                return (
                  <tr
                    key={box.id}
                    className={`cursor-pointer hover:bg-slate-50 ${
                      selectedIds.has(box.id) ? 'bg-rose-50/60' : ''
                    }`}
                    onClick={() => setViewingBox(box)}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(box.id)}
                        onChange={() => {}}
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleSelected(box.id)
                        }}
                        aria-label={`Pilih ${box.boxNumber}`}
                        className="h-4 w-4 rounded border-slate-300 text-rose-600 focus:ring-rose-400"
                      />
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">{box.boxNumber}</td>
                    <td className="px-4 py-3 text-slate-700">
                      {batchNumbers.length > 0 ? batchNumbers.join(', ') : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                        {box.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{formatDate(box.createdAt)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <Pagination page={safePage} totalItems={sorted.length} onPageChange={setPage} />
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

      {viewingBox && (
        <Modal title={`Box Detail — ${viewingBox.boxNumber}`} onClose={() => setViewingBox(null)} wide>
          <BoxForm
            boxes={boxes}
            batches={batches}
            initial={viewingBox}
            onSubmit={(input) => {
              saveBox(input)
              setViewingBox(null)
            }}
            onCancel={() => setViewingBox(null)}
          />
        </Modal>
      )}

      {bulkDeleteConfirmOpen && (
        <ConfirmDialog
          title={`Hapus ${selectedIds.size} Box?`}
          message={
            `${eligibleBoxesToDelete.length} box akan dihapus` +
            (affectedBatchCount > 0
              ? `, dan ${affectedBatchCount} batch di dalamnya akan kembali ke status "Dibeli dari Seller".`
              : '.') +
            (blockedBoxesToDelete.length > 0
              ? ` ${blockedBoxesToDelete.length} box dilewati karena masih punya tagihan pajak yang dipublikasikan.`
              : '') +
            ' Tindakan ini tidak bisa dibatalkan.'
          }
          onConfirm={handleBulkDeleteConfirm}
          onCancel={() => setBulkDeleteConfirmOpen(false)}
        />
      )}

      {nothingToDeleteOpen && (
        <AlertDialog
          tone="error"
          title="Tidak Ada yang Bisa Dihapus"
          message="Semua box yang dipilih masih punya tagihan pajak yang dipublikasikan — hapus tagihannya dulu di halaman Tax Bills sebelum menghapus box ini."
          onClose={() => setNothingToDeleteOpen(false)}
        />
      )}
    </div>
  )
}
