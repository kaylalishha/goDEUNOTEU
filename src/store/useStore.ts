import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { makeId } from '../lib/id'
import {
  seedBatchBills,
  seedBatches,
  seedCustomers,
  seedEstimatorConfig,
  seedItems,
  seedTaxBills,
} from './seed'
import type {
  Batch,
  BatchBill,
  BatchBillStatus,
  BuktiTransfer,
  Customer,
  EstimatorConfig,
  Item,
  OrderStatus,
  OrderType,
  TaxBill,
  TaxBillStatus,
  TipeBarang,
  TipeKartu,
} from '../types'
import { PAYMENT_METHOD_OPTIONS, TAX_PAYMENT_WINDOW_DAYS } from '../types'

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
  boxNumber?: string
  orderIdWH: string
  orderType: OrderType
  photoDataUrls: string[]
  orderStatus: OrderStatus
  customerOrders: CustomerOrderInput[]
}

interface StoreState {
  customers: Customer[]
  batches: Batch[]
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
  saveBatch: (input: SaveBatchInput) => void
  // Assigns one box number to many batches at once — the box is usually
  // only known after a run of batches has already been recorded.
  bulkSetBoxNumber: (batchIds: string[], boxNumber: string) => void
  // Deletes one or many batch records along with their items and bills.
  deleteBatches: (batchIds: string[]) => void
  setItemWeights: (weights: Array<{ itemId: string; weightGrams: number }>) => void
  simulateCustomerUploadBatch: (batchBillId: string) => void
  confirmBatchBill: (batchBillId: string) => void
  rejectBatchBill: (batchBillId: string) => void

  // Feature C
  publishTaxBills: (
    bills: Array<
      Omit<TaxBill, 'id' | 'publishedAt' | 'deadline' | 'status' | 'buktiTransfer'>
    >,
  ) => void
  simulateCustomerUploadTax: (taxBillId: string) => void
  confirmTaxBill: (taxBillId: string) => void
  rejectTaxBill: (taxBillId: string) => void

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
      status: 'Belum Dibayar',
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
          const batch: Batch = {
            id: batchId,
            batchNumber: input.batchNumber,
            boxNumber: input.boxNumber?.trim() || undefined,
            orderIdWH: input.orderIdWH,
            orderType: input.orderType,
            photoDataUrls: input.photoDataUrls,
            orderStatus: input.orderStatus,
            createdAt: isEdit
              ? (s.batches.find((b) => b.id === batchId)?.createdAt ?? now)
              : now,
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

      bulkSetBoxNumber: (batchIds, boxNumber) => {
        const idSet = new Set(batchIds)
        const now = new Date().toISOString()
        set((s) => ({
          batches: s.batches.map((b) =>
            idSet.has(b.id) ? { ...b, boxNumber, updatedAt: now } : b,
          ),
        }))
        get().pushToast(`Box number ${boxNumber} diterapkan ke ${batchIds.length} batch.`, 'success')
      },

      deleteBatches: (batchIds) => {
        const idSet = new Set(batchIds)
        set((s) => ({
          batches: s.batches.filter((b) => !idSet.has(b.id)),
          items: s.items.filter((i) => !idSet.has(i.batchId)),
          batchBills: s.batchBills.filter((b) => !idSet.has(b.batchId)),
        }))
        get().pushToast(
          batchIds.length > 1 ? `${batchIds.length} batch record dihapus.` : 'Batch record dihapus.',
          'success',
        )
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
              ? { ...b, status: 'Dibayar' as BatchBillStatus, paidAt: new Date().toISOString() }
              : b,
          ),
        }))
        get().pushToast('Pembayaran batch dikonfirmasi — status Dibayar.', 'success')
      },

      rejectBatchBill: (batchBillId) => {
        set((s) => ({
          batchBills: s.batchBills.map((b) =>
            b.id === batchBillId
              ? { ...b, status: 'Belum Dibayar' as BatchBillStatus, buktiTransfer: undefined, paidAt: undefined }
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
      // photoDataUrls (array) on Batch. Browsers with data saved before
      // that change need their persisted batches backfilled, or reads
      // like batch.photoDataUrls[0] crash the app on load.
      version: 1,
      migrate: (persistedState) => {
        const state = persistedState as { batches?: Array<Record<string, unknown>> }
        if (state?.batches) {
          state.batches = state.batches.map((b) => ({
            ...b,
            orderIdWH: b.orderIdWH ?? '',
            photoDataUrls: b.photoDataUrls ?? (b.photoDataUrl ? [b.photoDataUrl] : []),
          }))
        }
        return state
      },
    },
  ),
)
