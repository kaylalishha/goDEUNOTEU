import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { makeId } from '../lib/id'
import {
  seedBatchBills,
  seedCustomers,
  seedEstimatorConfig,
  seedItems,
  seedTaxBills,
} from './seed'
import type {
  BatchBill,
  BatchBillStatus,
  BuktiTransfer,
  Customer,
  EstimatorConfig,
  Item,
  TaxBill,
  TaxBillStatus,
} from '../types'
import { TAX_PAYMENT_WINDOW_DAYS } from '../types'

interface Toast {
  id: string
  message: string
  tone: 'success' | 'error' | 'info'
}

interface StoreState {
  customers: Customer[]
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

  // Feature A
  addItem: (item: Omit<Item, 'id' | 'createdAt' | 'updatedAt'>) => void
  updateItem: (id: string, patch: Partial<Omit<Item, 'id'>>) => void
  setItemWeights: (weights: Array<{ itemId: string; weightGrams: number }>) => void

  // Feature B
  createBatchBill: (
    input: Omit<BatchBill, 'id' | 'total' | 'status' | 'createdAt' | 'buktiTransfer'>,
  ) => void
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

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      customers: seedCustomers,
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

      addItem: (item) => {
        const now = new Date().toISOString()
        const newItem: Item = { ...item, id: makeId('item'), createdAt: now, updatedAt: now }
        set((s) => ({ items: [newItem, ...s.items] }))
        get().pushToast('Item record berhasil disimpan.', 'success')
      },

      updateItem: (id, patch) => {
        set((s) => {
          const items = s.items.map((it) =>
            it.id === id ? { ...it, ...patch, updatedAt: new Date().toISOString() } : it,
          )
          // FR-GO-A-003: if a bill already references this item, keep its total in sync.
          const batchBills = s.batchBills.map((bill) => {
            if (!bill.itemIds.includes(id)) return bill
            const total =
              bill.itemIds.reduce((sum, itemId) => {
                const it = items.find((i) => i.id === itemId)
                return sum + (it?.priceIDR ?? 0)
              }, 0) + bill.upnotesTotal
            return { ...bill, total }
          })
          return { items, batchBills }
        })
        get().pushToast('Item record berhasil diperbarui.', 'success')
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
            b.id === batchBillId ? { ...b, status: 'Lunas' as BatchBillStatus } : b,
          ),
        }))
        get().pushToast('Pembayaran batch dikonfirmasi — status Lunas.', 'success')
      },

      rejectBatchBill: (batchBillId) => {
        set((s) => ({
          batchBills: s.batchBills.map((b) =>
            b.id === batchBillId
              ? { ...b, status: 'Belum Lunas' as BatchBillStatus, buktiTransfer: undefined }
              : b,
          ),
        }))
        get().pushToast('Bukti transfer ditolak — customer diminta upload ulang.', 'error')
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
    { name: 'go-aikatsu-admin-store' },
  ),
)
