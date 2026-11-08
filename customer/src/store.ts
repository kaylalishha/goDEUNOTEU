import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { TAX_REQUIRES_PAID_BATCH } from './config'
import type { Batch, BatchBill, Box, BuktiTransfer, Customer, EstimatorConfig, Item, PaymentMethod, TaxBill } from './shared/types'
import {
  seedBatchBills,
  seedBatches,
  seedBoxes,
  seedCustomers,
  seedEstimatorConfig,
  seedItems,
  seedTaxBills,
} from './shared/seed'

// Demo mode: the same seed data as the admin dashboard's demo mode, kept in
// this browser's localStorage. Every action mirrors what the Supabase backend
// does for a customer (see supabase/migrations/0001_init.sql), so swapping in
// the real backend later changes this file, not the pages.

export type BillKind = 'batch' | 'tax'

export interface Toast {
  id: string
  message: string
  tone: 'success' | 'error' | 'info'
}

interface DemoData {
  customers: Customer[]
  batches: Batch[]
  boxes: Box[]
  items: Item[]
  batchBills: BatchBill[]
  taxBills: TaxBill[]
  estimatorConfig: EstimatorConfig
  // Rejections by the (simulated) admin, so the customer can be told about them.
  rejections: Array<{ kind: BillKind; billId: string; at: string }>
}

interface State extends DemoData {
  customerId: string | null
  readNotificationIds: string[]
  toasts: Toast[]
  login: (customerId: string) => void
  logout: () => void
  submitPayment: (input: {
    kind: BillKind
    billId: string
    method: PaymentMethod
    fileName: string
    dataUrl: string
  }) => boolean
  demoAdminDecision: (kind: BillKind, billId: string, decision: 'confirm' | 'reject') => void
  markNotificationsRead: (ids: string[]) => void
  resetDemo: () => void
  pushToast: (message: string, tone?: Toast['tone']) => void
  dismissToast: (id: string) => void
}

function seedData(): DemoData {
  return {
    customers: seedCustomers,
    batches: seedBatches,
    boxes: seedBoxes,
    items: seedItems,
    batchBills: seedBatchBills,
    taxBills: seedTaxBills,
    estimatorConfig: seedEstimatorConfig,
    rejections: [],
  }
}

const newId = () => Math.random().toString(36).slice(2, 10)

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      ...seedData(),
      customerId: null,
      readNotificationIds: [],
      toasts: [],

      login: (customerId) => {
        set({ customerId })
        const name = get().customers.find((c) => c.id === customerId)?.name
        get().pushToast(`Masuk sebagai ${name}.`, 'success')
      },
      logout: () => {
        set({ customerId: null })
        get().pushToast('Kamu sudah keluar.', 'info')
      },

      // Mirrors submit_payment_proof(): only the bill's owner, only while
      // the bill is Belum Bayar.
      submitPayment: ({ kind, billId, method, fileName, dataUrl }) => {
        const s = get()
        const fail = (msg: string) => {
          s.pushToast(msg, 'error')
          return false
        }
        const bill = kind === 'batch' ? s.batchBills.find((b) => b.id === billId) : s.taxBills.find((t) => t.id === billId)
        if (!bill) return fail('Tagihan tidak ditemukan.')
        if (bill.customerId !== s.customerId) return fail('Bukan tagihan milik kamu.')
        if (bill.status !== 'Belum Bayar') return fail('Tagihan ini sudah dibayar / menunggu konfirmasi.')
        if (kind === 'tax' && TAX_REQUIRES_PAID_BATCH && unpaidBatchBillsForTax(s, bill as TaxBill).length > 0) {
          return fail('Lunasi tagihan batch di box ini dulu.')
        }
        const bukti: BuktiTransfer = { fileName, dataUrl, uploadedAt: new Date().toISOString(), paymentMethod: method }
        if (kind === 'batch') {
          set({
            batchBills: s.batchBills.map((b) =>
              b.id === billId ? { ...b, status: 'Menunggu Konfirmasi', buktiTransfer: bukti } : b,
            ),
          })
        } else {
          set({
            taxBills: s.taxBills.map((t) =>
              t.id === billId ? { ...t, status: 'Menunggu Konfirmasi', buktiTransfer: bukti } : t,
            ),
          })
        }
        s.pushToast('Bukti transfer terkirim. Menunggu konfirmasi admin.', 'success')
        return true
      },

      // Demo only: stands in for the admin's Confirm / Reject so the full
      // payment cycle can be tried without the admin dashboard.
      demoAdminDecision: (kind, billId, decision) => {
        const now = new Date().toISOString()
        const s = get()
        if (kind === 'batch') {
          set({
            batchBills: s.batchBills.map((b) =>
              b.id !== billId || b.status !== 'Menunggu Konfirmasi'
                ? b
                : decision === 'confirm'
                  ? { ...b, status: 'Lunas', paidAt: now }
                  : { ...b, status: 'Belum Bayar', buktiTransfer: undefined, paidAt: undefined },
            ),
          })
        } else {
          set({
            taxBills: s.taxBills.map((t) =>
              t.id !== billId || t.status !== 'Menunggu Konfirmasi'
                ? t
                : decision === 'confirm'
                  ? { ...t, status: 'Lunas' }
                  : { ...t, status: 'Belum Bayar', buktiTransfer: undefined },
            ),
          })
        }
        if (decision === 'reject') set({ rejections: [...get().rejections, { kind, billId, at: now }] })
        s.pushToast(
          decision === 'confirm' ? 'Simulasi: admin mengonfirmasi pembayaran.' : 'Simulasi: admin menolak bukti transfer.',
          decision === 'confirm' ? 'success' : 'error',
        )
      },

      markNotificationsRead: (ids) =>
        set((s) => ({ readNotificationIds: Array.from(new Set([...s.readNotificationIds, ...ids])) })),

      resetDemo: () => {
        set({ ...seedData(), readNotificationIds: [] })
        get().pushToast('Data demo dikembalikan ke awal.', 'info')
      },

      pushToast: (message, tone = 'info') => {
        const id = newId()
        set((s) => ({ toasts: [...s.toasts, { id, message, tone }] }))
        setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 4000)
      },
      dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
    }),
    {
      name: 'go-deunoteu-customer-demo-v1',
      partialize: ({ toasts: _toasts, ...rest }) => rest,
    },
  ),
)

// ── Selectors ───────────────────────────────────────────────────────
type Data = Pick<State, 'batches' | 'boxes' | 'items' | 'batchBills' | 'taxBills' | 'customerId' | 'customers'>

// FR-GO-1-001: one bill per batch the customer has items in. A bill with no
// items (customer removed from the batch) has a Rp0 total and is hidden.
export function myBatchBills(s: Data): BatchBill[] {
  return s.batchBills
    .filter((b) => b.customerId === s.customerId && b.itemIds.length > 0)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function myTaxBills(s: Data): TaxBill[] {
  return s.taxBills
    .filter((t) => t.customerId === s.customerId)
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
}

export function myBatches(s: Data): Batch[] {
  const ids = new Set(s.items.filter((i) => i.customerId === s.customerId).map((i) => i.batchId))
  return s.batches.filter((b) => ids.has(b.id))
}

export function unpaidBatchBillsForTax(s: Data, tax: TaxBill): BatchBill[] {
  const batchIds = new Set(s.batches.filter((b) => b.boxId === tax.boxId).map((b) => b.id))
  return s.batchBills.filter(
    (b) => b.customerId === tax.customerId && batchIds.has(b.batchId) && b.itemIds.length > 0 && b.status !== 'Lunas',
  )
}

export interface Notification {
  id: string
  message: string
  at: string
  to: string
}

// FR-GO-L-005: the same four events the backend's notify_bill_change trigger
// records — new batch bill, new tax bill, payment confirmed, proof rejected.
export function myNotifications(s: Data & Pick<State, 'rejections'>): Notification[] {
  const boxNumber = (id: string) => s.boxes.find((b) => b.id === id)?.boxNumber ?? '—'
  const out: Notification[] = []
  for (const b of myBatchBills(s)) {
    out.push({ id: `new-${b.id}`, message: `Ada tagihan ${b.batchNumber} baru untuk kamu.`, at: b.createdAt, to: '/id/order' })
    if (b.status === 'Lunas' && b.paidAt)
      out.push({ id: `ok-${b.id}`, message: `Pembayaran tagihan ${b.batchNumber} sudah dikonfirmasi. Terima kasih!`, at: b.paidAt, to: '/id/order' })
  }
  for (const t of myTaxBills(s)) {
    const label = `tagihan pajak ${boxNumber(t.boxId)}`
    out.push({ id: `new-${t.id}`, message: `Ada ${label} baru untuk kamu.`, at: t.publishedAt, to: '/id/ems-tax' })
    if (t.status === 'Lunas')
      out.push({ id: `ok-${t.id}`, message: `Pembayaran ${label} sudah dikonfirmasi. Terima kasih!`, at: t.buktiTransfer?.uploadedAt ?? t.publishedAt, to: '/id/ems-tax' })
  }
  for (const r of s.rejections) {
    const bill = r.kind === 'batch' ? s.batchBills.find((b) => b.id === r.billId) : s.taxBills.find((t) => t.id === r.billId)
    if (!bill || bill.customerId !== s.customerId) continue
    const label = r.kind === 'batch' ? `tagihan ${(bill as BatchBill).batchNumber}` : `tagihan pajak ${boxNumber((bill as TaxBill).boxId)}`
    out.push({
      id: `rej-${r.billId}-${r.at}`,
      message: `Bukti transfer ${label} ditolak. Silakan upload ulang.`,
      at: r.at,
      to: r.kind === 'batch' ? '/id/order' : '/id/ems-tax',
    })
  }
  return out.sort((a, b) => b.at.localeCompare(a.at))
}
