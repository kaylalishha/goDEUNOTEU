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
  TaxBill,
  TaxBillStatus,
  TipeBarang,
  TipeKartu,
} from '../types'
import { TAX_PAYMENT_WINDOW_DAYS } from '../types'

interface Toast {
  id: string
  message: string
  tone: 'success' | 'error' | 'info'
}

export interface CustomerOrderItemInput {
  id?: string
  tipeBarang: TipeBarang
  tipeKartu?: TipeKartu
  priceJPY: number
  priceIDR: number
}

export interface CustomerOrderInput {
  customerId: string
  items: CustomerOrderItemInput[]
}

export interface SaveBatchInput {
  batchId?: string
  batchNumber: string
  boxNumber: string
  photoDataUrl?: string
  upnotesTotal: number
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

  // Feature A — one submitted form = one Batch, containing per-customer items
  saveBatch: (input: SaveBatchInput) => void
  setItemWeights: (weights: Array<{ itemId: string; weightGrams: number }>) => void

  // Feature B
  createBatchBill: (
    input: Omit<
      BatchBill,
      'id' | 'total' | 'status' | 'createdAt' | 'buktiTransfer' | 'paidAt'
    >,
  ) => void
  simulateCustomerUploadBatch: (batchBillId: string) => void
  confirmBatchBill: (batchBillId: string) => void
  rejectBatchBill: (batchBillId: string) => void
  updateBatchBillPaidAt: (batchBillId: string, paidAt: string | undefined) => void

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
  return {
    fileName: `bukti_${Date.now()}.png`,
    dataUrl:
      'data:image/svg+xml;utf8,' +
      encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="200"><rect width="320" height="200" fill="#f1f5f9"/><text x="160" y="105" font-family="monospace" font-size="13" text-anchor="middle" fill="#334155">bukti transfer (simulasi)</text></svg>`,
      ),
    uploadedAt: new Date().toISOString(),
  }
}

function recomputeBillTotals(items: Item[], batchBills: BatchBill[]): BatchBill[] {
  const itemIds = new Set(items.map((i) => i.id))
  return batchBills.map((bill) => {
    const stillPresent = bill.itemIds.filter((id) => itemIds.has(id))
    const itemTotal = stillPresent.reduce((sum, id) => {
      const it = items.find((i) => i.id === id)
      return sum + (it?.priceIDR ?? 0)
    }, 0)
    if (
      stillPresent.length === bill.itemIds.length &&
      itemTotal + bill.upnotesTotal === bill.total
    ) {
      return bill
    }
    return { ...bill, itemIds: stillPresent, total: itemTotal + bill.upnotesTotal }
  })
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

        set((s) => {
          const batch: Batch = {
            id: batchId,
            batchNumber: input.batchNumber,
            boxNumber: input.boxNumber,
            photoDataUrl: input.photoDataUrl,
            upnotesTotal: input.upnotesTotal,
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
            order.items.map((it) => ({
              id: it.id ?? makeId('item'),
              batchId,
              customerId: order.customerId,
              tipeBarang: it.tipeBarang,
              tipeKartu: it.tipeKartu,
              priceJPY: it.priceJPY,
              priceIDR: it.priceIDR,
              weightGrams: it.id
                ? s.items.find((i) => i.id === it.id)?.weightGrams
                : undefined,
              createdAt: it.id
                ? (s.items.find((i) => i.id === it.id)?.createdAt ?? now)
                : now,
              updatedAt: now,
            })),
          )

          const items = [
            ...s.items.filter((i) => i.batchId !== batchId),
            ...incomingItems,
          ]

          const batchBills = recomputeBillTotals(items, s.batchBills)

          return { batches, items, batchBills }
        })

        get().pushToast(
          isEdit ? 'Batch record berhasil diperbarui.' : 'Batch record berhasil disimpan.',
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

      createBatchBill: (input) => {
        const items = get().items.filter((it) => input.itemIds.includes(it.id))
        const itemTotal = items.reduce((sum, it) => sum + it.priceIDR, 0)
        const total = itemTotal + input.upnotesTotal
        const bill: BatchBill = {
          ...input,
          id: makeId('bbill'),
          total,
          status: 'Belum Lunas',
          createdAt: new Date().toISOString(),
        }
        set((s) => ({ batchBills: [bill, ...s.batchBills] }))
        get().pushToast(
          `Tagihan batch ${input.batchNumber} untuk ${get().getCustomerName(input.customerId)} diterbitkan ke Customer Dashboard.`,
          'success',
        )
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
              ? { ...b, status: 'Belum Lunas' as BatchBillStatus, buktiTransfer: undefined, paidAt: undefined }
              : b,
          ),
        }))
        get().pushToast('Bukti transfer ditolak — customer diminta upload ulang.', 'error')
      },

      updateBatchBillPaidAt: (batchBillId, paidAt) => {
        set((s) => ({
          batchBills: s.batchBills.map((b) => (b.id === batchBillId ? { ...b, paidAt } : b)),
        }))
        get().pushToast('Tanggal pembayaran diperbarui.', 'success')
      },

      publishTaxBills: (bills) => {
        const now = new Date()
        const deadline = new Date(now)
        deadline.setDate(deadline.getDate() + TAX_PAYMENT_WINDOW_DAYS)
        const newBills: TaxBill[] = bills.map((b) => ({
          ...b,
          id: makeId('tbill'),
          publishedAt: now.toISOString(),
          deadline: deadline.toISOString(),
          status: 'Belum Bayar',
        }))
        set((s) => ({ taxBills: [...newBills, ...s.taxBills] }))
        get().pushToast(
          `Tagihan pajak box ${bills[0]?.boxNumber ?? ''} diterbitkan ke ${newBills.length} customer. Notifikasi terkirim.`,
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
    { name: 'go-aikatsu-admin-store-v2' },
  ),
)
