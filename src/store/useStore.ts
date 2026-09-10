import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { makeId } from '../lib/id'
import {
  seedBatchBills,
  seedBatches,
  seedBoxes,
  seedCustomers,
  seedEstimatorConfig,
  seedItems,
  seedTaxBills,
} from './seed'
import type {
  Batch,
  BatchBill,
  BatchBillStatus,
  Box,
  BoxStatus,
  BuktiTransfer,
  Customer,
  EstimatorConfig,
  Item,
  OrderType,
  TaxBill,
  TaxBillStatus,
  TipeBarang,
  TipeKartu,
} from '../types'
import { DEFAULT_BOX_STATUS, PAYMENT_METHOD_OPTIONS, TAX_PAYMENT_WINDOW_DAYS } from '../types'

const DEFAULT_BANK_ACCOUNT = 'BCA 1234567890 a.n. Admin GO Aikatsu'

interface Toast {
  id: string
  message: string
  tone: 'success' | 'error' | 'info'
}

export interface CustomerOrderItemInput {
  id?: string
  tipeBarang: TipeBarang
  tipeKartu?: TipeKartu
  priceIDR: number
  weightGrams?: number
}

export interface CustomerOrderInput {
  customerId: string
  items: CustomerOrderItemInput[]
}

export interface SaveBatchInput {
  batchId?: string
  batchNumber: string
  orderIdWH: string
  orderType: OrderType
  photoDataUrls: string[]
  customerOrders: CustomerOrderInput[]
}

export interface SaveBoxInput {
  boxId?: string
  boxNumber: string
  batchIds: string[]
  status?: BoxStatus
}

interface StoreState {
  customers: Customer[]
  batches: Batch[]
  boxes: Box[]
  items: Item[]
  batchBills: BatchBill[]
  taxBills: TaxBill[]
  estimatorConfig: EstimatorConfig
  toasts: Toast[]

  // customers
  getCustomerName: (customerId: string) => string

  // toasts
  pushToast: (message: string, tone?: Toast['tone']) => void
  dismissToast: (id: string) => void

  // Feature A — one submitted form = one Batch, containing per-customer items.
  // Saving a batch also auto-bills every customer in it (was Feature B).
  // orderStatus and box membership are never touched here — a batch always
  // starts at "Dibeli dari Seller" and only Feature B (Box Management)
  // can move it, since a box ships as one unit.
  saveBatch: (input: SaveBatchInput) => void
  // Deletes one or many batch records along with their items and bills.
  deleteBatches: (batchIds: string[]) => void
  setItemWeights: (weights: Array<{ itemId: string; weightGrams: number }>) => void
  simulateCustomerUploadBatch: (batchBillId: string) => void
  confirmBatchBill: (batchBillId: string) => void
  rejectBatchBill: (batchBillId: string) => void

  // Feature B — Box Management. A box's status is the single source of
  // truth for every batch inside it.
  // Creates or edits a box's number, status, and membership in one go.
  // Batches added to the box inherit its (possibly newly set) status;
  // batches removed from it fall back to "Dibeli dari Seller" (no box,
  // no derived status).
  saveBox: (input: SaveBoxInput) => void
  // Deletes one or many boxes. Every batch that was inside a deleted box
  // is released back to unboxed ("Dibeli dari Seller"), same as removing
  // it from the box via saveBox.
  deleteBoxes: (boxIds: string[]) => void

  // Feature C
  publishTaxBills: (
    bills: Array<
      Omit<TaxBill, 'id' | 'publishedAt' | 'deadline' | 'status' | 'buktiTransfer'>
    >,
  ) => void
  simulateCustomerUploadTax: (taxBillId: string) => void
  confirmTaxBill: (taxBillId: string) => void
  rejectTaxBill: (taxBillId: string) => void
  // Deletes one or many published tax bills (eg. undoing a publish).
  deleteTaxBills: (taxBillIds: string[]) => void

  // Feature D
  updateEstimatorConfig: (patch: Partial<Omit<EstimatorConfig, 'updatedAt'>>) => void
}

function attachDemoBukti(): BuktiTransfer {
  const paymentMethod =
    PAYMENT_METHOD_OPTIONS[Math.floor(Math.random() * PAYMENT_METHOD_OPTIONS.length)]
  return {
    fileName: `bukti_${Date.now()}.png`,
    dataUrl:
      'data:image/svg+xml;utf8,' +
      encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="200"><rect width="320" height="200" fill="#f1f5f9"/><text x="160" y="105" font-family="monospace" font-size="13" text-anchor="middle" fill="#334155">bukti transfer (simulasi)</text></svg>`,
      ),
    uploadedAt: new Date().toISOString(),
    paymentMethod,
  }
}

// Auto-billing: every customer present in a batch gets (or keeps) exactly
// one BatchBill for that batch, always in sync with their current items.
// Replaces the old separate "Create Batch Bill" step (Feature B).
function syncBatchBillsForBatch(
  batchId: string,
  batchNumber: string,
  items: Item[],
  existingBills: BatchBill[],
  now: string,
): { batchBills: BatchBill[]; newlyBilled: number } {
  const otherBatchBills = existingBills.filter((b) => b.batchId !== batchId)
  const existingForBatch = existingBills.filter((b) => b.batchId === batchId)
  const existingByCustomer = new Map(existingForBatch.map((b) => [b.customerId, b]))

  const customerIdsInBatch = Array.from(new Set(items.map((i) => i.customerId)))
  let newlyBilled = 0

  const syncedForBatch: BatchBill[] = customerIdsInBatch.map((customerId) => {
    const customerItems = items.filter((i) => i.customerId === customerId)
    const customerItemIds = customerItems.map((i) => i.id)
    const itemTotal = customerItems.reduce((sum, i) => sum + i.priceIDR, 0)
    const existing = existingByCustomer.get(customerId)
    existingByCustomer.delete(customerId)

    if (existing) {
      return { ...existing, itemIds: customerItemIds, total: itemTotal + existing.upnotesTotal }
    }
    newlyBilled += 1
    return {
      id: makeId('bbill'),
      batchId,
      batchNumber,
      customerId,
      itemIds: customerItemIds,
      upnotesTotal: 0,
      bankAccount: DEFAULT_BANK_ACCOUNT,
      total: itemTotal,
      status: 'Belum Bayar',
      createdAt: now,
    }
  })

  // Customers who were removed from the batch (edit) keep their bill record
  // but it no longer references any item.
  const orphaned = Array.from(existingByCustomer.values()).map((b) => ({
    ...b,
    itemIds: [],
    total: b.upnotesTotal,
  }))

  return { batchBills: [...otherBatchBills, ...syncedForBatch, ...orphaned], newlyBilled }
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      customers: seedCustomers,
      batches: seedBatches,
      boxes: seedBoxes,
      items: seedItems,
      batchBills: seedBatchBills,
      taxBills: seedTaxBills,
      estimatorConfig: seedEstimatorConfig,
      toasts: [],

      getCustomerName: (customerId) =>
        get().customers.find((c) => c.id === customerId)?.name ?? 'Unknown',

      pushToast: (message, tone = 'info') => {
        const id = makeId('toast')
        set((s) => ({ toasts: [...s.toasts, { id, message, tone }] }))
        setTimeout(() => {
          set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
        }, 4000)
      },
      dismissToast: (id) =>
        set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

      saveBatch: (input) => {
        const now = new Date().toISOString()
        const isEdit = Boolean(input.batchId)
        const batchId = input.batchId ?? makeId('batch')
        let newlyBilled = 0

        set((s) => {
          const existing = s.batches.find((b) => b.id === batchId)
          const batch: Batch = {
            id: batchId,
            batchNumber: input.batchNumber,
            boxNumber: existing?.boxNumber,
            orderIdWH: input.orderIdWH,
            orderType: input.orderType,
            photoDataUrls: input.photoDataUrls,
            orderStatus: existing?.orderStatus ?? 'Dibeli dari Seller',
            createdAt: isEdit ? (existing?.createdAt ?? now) : now,
            updatedAt: now,
          }
          const batches = isEdit
            ? s.batches.map((b) => (b.id === batchId ? batch : b))
            : [batch, ...s.batches]

          const incomingItems: Item[] = input.customerOrders.flatMap((order) =>
            order.items.map((it) => {
              const existing = it.id ? s.items.find((i) => i.id === it.id) : undefined
              return {
                id: it.id ?? makeId('item'),
                batchId,
                customerId: order.customerId,
                tipeBarang: it.tipeBarang,
                tipeKartu: it.tipeKartu,
                priceIDR: it.priceIDR,
                weightGrams: it.weightGrams ?? existing?.weightGrams,
                createdAt: existing?.createdAt ?? now,
                updatedAt: now,
              }
            }),
          )

          const items = [
            ...s.items.filter((i) => i.batchId !== batchId),
            ...incomingItems,
          ]

          const synced = syncBatchBillsForBatch(
            batchId,
            input.batchNumber,
            incomingItems,
            s.batchBills,
            now,
          )
          newlyBilled = synced.newlyBilled

          return { batches, items, batchBills: synced.batchBills }
        })

        get().pushToast(
          isEdit
            ? 'Batch record berhasil diperbarui.'
            : `Batch record berhasil disimpan. ${newlyBilled} tagihan otomatis diterbitkan.`,
          'success',
        )
      },

      deleteBatches: (batchIds) => {
        const idSet = new Set(batchIds)
        set((s) => ({
          batches: s.batches.filter((b) => !idSet.has(b.id)),
          items: s.items.filter((i) => !idSet.has(i.batchId)),
          batchBills: s.batchBills.filter((b) => !idSet.has(b.batchId)),
          boxes: s.boxes.map((box) => ({
            ...box,
            batchIds: box.batchIds.filter((id) => !idSet.has(id)),
          })),
        }))
        get().pushToast(
          batchIds.length > 1 ? `${batchIds.length} batch record dihapus.` : 'Batch record dihapus.',
          'success',
        )
      },

      saveBox: (input) => {
        const now = new Date().toISOString()
        const isEdit = Boolean(input.boxId)
        const boxId = input.boxId ?? makeId('box')

        set((s) => {
          const existing = s.boxes.find((b) => b.id === boxId)
          const status: BoxStatus = input.status ?? existing?.status ?? DEFAULT_BOX_STATUS
          const box: Box = {
            id: boxId,
            boxNumber: input.boxNumber,
            batchIds: input.batchIds,
            status,
            createdAt: existing?.createdAt ?? now,
            updatedAt: now,
          }
          const boxes = isEdit ? s.boxes.map((b) => (b.id === boxId ? box : b)) : [box, ...s.boxes]

          const includedIds = new Set(input.batchIds)
          const previouslyIncludedIds = new Set(existing?.batchIds ?? [])
          const batches = s.batches.map((b) => {
            if (includedIds.has(b.id)) {
              return { ...b, boxNumber: box.boxNumber, orderStatus: status, updatedAt: now }
            }
            if (previouslyIncludedIds.has(b.id)) {
              return { ...b, boxNumber: undefined, orderStatus: 'Dibeli dari Seller' as const, updatedAt: now }
            }
            return b
          })

          return { boxes, batches }
        })

        get().pushToast(isEdit ? 'Box berhasil diperbarui.' : 'Box baru berhasil dibuat.', 'success')
      },

      deleteBoxes: (boxIds) => {
        const idSet = new Set(boxIds)
        const now = new Date().toISOString()
        set((s) => {
          const affectedBatchIds = new Set(
            s.boxes.filter((b) => idSet.has(b.id)).flatMap((b) => b.batchIds),
          )
          return {
            boxes: s.boxes.filter((b) => !idSet.has(b.id)),
            batches: s.batches.map((b) =>
              affectedBatchIds.has(b.id)
                ? { ...b, boxNumber: undefined, orderStatus: 'Dibeli dari Seller' as const, updatedAt: now }
                : b,
            ),
          }
        })
        get().pushToast(boxIds.length > 1 ? `${boxIds.length} box dihapus.` : 'Box dihapus.', 'success')
      },

      setItemWeights: (weights) => {
        const byId = new Map(weights.map((w) => [w.itemId, w.weightGrams]))
        set((s) => ({
          items: s.items.map((it) =>
            byId.has(it.id) ? { ...it, weightGrams: byId.get(it.id) } : it,
          ),
        }))
      },

      simulateCustomerUploadBatch: (batchBillId) => {
        set((s) => ({
          batchBills: s.batchBills.map((b) =>
            b.id === batchBillId
              ? { ...b, status: 'Menunggu Konfirmasi' as BatchBillStatus, buktiTransfer: attachDemoBukti() }
              : b,
          ),
        }))
      },

      confirmBatchBill: (batchBillId) => {
        set((s) => ({
          batchBills: s.batchBills.map((b) =>
            b.id === batchBillId
              ? { ...b, status: 'Lunas' as BatchBillStatus, paidAt: new Date().toISOString() }
              : b,
          ),
        }))
        get().pushToast('Pembayaran batch dikonfirmasi — status Lunas.', 'success')
      },

      rejectBatchBill: (batchBillId) => {
        set((s) => ({
          batchBills: s.batchBills.map((b) =>
            b.id === batchBillId
              ? { ...b, status: 'Belum Bayar' as BatchBillStatus, buktiTransfer: undefined, paidAt: undefined }
              : b,
          ),
        }))
        get().pushToast('Bukti transfer ditolak — customer diminta upload ulang.', 'error')
      },

      publishTaxBills: (bills) => {
        const nowIso = new Date().toISOString()
        set((s) => {
          const newBills: TaxBill[] = bills.map((b) => {
            // Every batch under one box shares a single payment deadline —
            // if this box was already published before, new customers
            // added to it later inherit that same deadline rather than
            // getting a fresh 7-day window from today.
            const existingForBox = s.taxBills.find((t) => t.boxNumber === b.boxNumber)
            let deadlineIso = existingForBox?.deadline
            if (!deadlineIso) {
              const d = new Date(nowIso)
              d.setDate(d.getDate() + TAX_PAYMENT_WINDOW_DAYS)
              deadlineIso = d.toISOString()
            }
            return {
              ...b,
              id: makeId('tbill'),
              publishedAt: nowIso,
              deadline: deadlineIso,
              status: 'Belum Bayar',
            }
          })
          return { taxBills: [...newBills, ...s.taxBills] }
        })
        get().pushToast(
          `Tagihan pajak box ${bills[0]?.boxNumber ?? ''} diterbitkan ke ${bills.length} customer. Notifikasi terkirim.`,
          'success',
        )
      },

      simulateCustomerUploadTax: (taxBillId) => {
        set((s) => ({
          taxBills: s.taxBills.map((t) =>
            t.id === taxBillId
              ? { ...t, status: 'Menunggu Konfirmasi' as TaxBillStatus, buktiTransfer: attachDemoBukti() }
              : t,
          ),
        }))
      },

      confirmTaxBill: (taxBillId) => {
        set((s) => ({
          taxBills: s.taxBills.map((t) =>
            t.id === taxBillId ? { ...t, status: 'Lunas' as TaxBillStatus } : t,
          ),
        }))
        get().pushToast('Pembayaran pajak dikonfirmasi — status Lunas.', 'success')
      },

      rejectTaxBill: (taxBillId) => {
        set((s) => ({
          taxBills: s.taxBills.map((t) =>
            t.id === taxBillId
              ? { ...t, status: 'Belum Bayar' as TaxBillStatus, buktiTransfer: undefined }
              : t,
          ),
        }))
        get().pushToast('Bukti transfer pajak ditolak — customer diminta upload ulang.', 'error')
      },

      deleteTaxBills: (taxBillIds) => {
        const idSet = new Set(taxBillIds)
        set((s) => ({ taxBills: s.taxBills.filter((t) => !idSet.has(t.id)) }))
        get().pushToast(
          taxBillIds.length > 1 ? `${taxBillIds.length} tagihan pajak dihapus.` : 'Tagihan pajak dihapus.',
          'success',
        )
      },

      updateEstimatorConfig: (patch) => {
        set((s) => ({
          estimatorConfig: { ...s.estimatorConfig, ...patch, updatedAt: new Date().toISOString() },
        }))
        get().pushToast('Konfigurasi Price Estimator disimpan dan langsung berlaku.', 'success')
      },
    }),
    {
      name: 'go-aikatsu-admin-store-v2',
      // v1 introduced orderIdWH and switched photoDataUrl (single) to
      // photoDataUrls (array) on Batch. v2 added itemIds to TaxBill. v3
      // introduced the Box entity (Feature B) and dropped "Menunggu
      // Pembayaran ke Seller" from OrderStatus — box status is now the
      // single source of truth for every batch inside it. v4 renamed
      // BatchBillStatus to match TaxBillStatus's wording ("Belum Dibayar"
      // → "Belum Bayar", "Dibayar" → "Lunas"). v5 grew the seed customer
      // list from 5 to 15 — persisted state otherwise keeps whatever
      // `customers` array a browser already saved, so the 10 new demo
      // customers would silently never show up for anyone who'd already
      // used the app. Browsers with data saved before any of these
      // changes need their persisted records backfilled, or the app
      // crashes reading fields that don't exist yet, or shows a status
      // (or a missing customer) no longer matching the current app.
      version: 5,
      migrate: (persistedState) => {
        const state = persistedState as {
          customers?: Array<Record<string, unknown>>
          batches?: Array<Record<string, unknown>>
          boxes?: Array<Record<string, unknown>>
          taxBills?: Array<Record<string, unknown>>
          batchBills?: Array<Record<string, unknown>>
        }
        if (state?.customers) {
          const existingIds = new Set(state.customers.map((c) => c.id))
          const missingSeedCustomers = seedCustomers.filter((c) => !existingIds.has(c.id))
          state.customers = [
            ...state.customers,
            ...(missingSeedCustomers as unknown as Array<Record<string, unknown>>),
          ]
        }
        if (state?.batches) {
          state.batches = state.batches.map((b) => ({
            ...b,
            orderIdWH: b.orderIdWH ?? '',
            photoDataUrls: b.photoDataUrls ?? (b.photoDataUrl ? [b.photoDataUrl] : []),
            orderStatus: b.orderStatus === 'Menunggu Pembayaran ke Seller' ? 'Dibeli dari Seller' : b.orderStatus,
          }))
        }
        if (state?.taxBills) {
          state.taxBills = state.taxBills.map((t) => ({
            ...t,
            itemIds: t.itemIds ?? [],
          }))
        }
        if (state?.batchBills) {
          const BATCH_BILL_STATUS_RENAME: Record<string, string> = {
            'Belum Dibayar': 'Belum Bayar',
            Dibayar: 'Lunas',
          }
          state.batchBills = state.batchBills.map((b) => ({
            ...b,
            status: BATCH_BILL_STATUS_RENAME[b.status as string] ?? b.status,
          }))
        }
        if (!state.boxes && state?.batches) {
          // Reconstruct one Box per pre-existing boxNumber, best-effort:
          // every batch in the group is forced onto the first batch's
          // status so the new "one box, one status" invariant holds.
          const byBoxNumber = new Map<string, Array<Record<string, unknown>>>()
          for (const b of state.batches) {
            const boxNumber = b.boxNumber as string | undefined
            if (!boxNumber) continue
            byBoxNumber.set(boxNumber, [...(byBoxNumber.get(boxNumber) ?? []), b])
          }
          state.boxes = Array.from(byBoxNumber.entries()).map(([boxNumber, batchesInBox]) => ({
            id: `box_migrated_${boxNumber}`,
            boxNumber,
            batchIds: batchesInBox.map((b) => b.id as string),
            status: (batchesInBox[0]?.orderStatus as string) ?? 'Di WH Jepang',
            createdAt: (batchesInBox[0]?.createdAt as string) ?? new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }))
          for (const box of state.boxes) {
            const idsInBox = new Set(box.batchIds as string[])
            state.batches = state.batches.map((b) =>
              idsInBox.has(b.id as string) ? { ...b, orderStatus: box.status } : b,
            )
          }
        }
        return state
      },
    },
  ),
)
