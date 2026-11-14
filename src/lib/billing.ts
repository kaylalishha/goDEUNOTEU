// Billing rules shared by Order Recap, Tax Bills and Overview, so every page
// derives the same numbers from the same store data and they can't drift.
import { daysRemaining } from './format'
import { BATCH_BILL_STATUSES, type BatchBill, type BatchBillStatus, type TaxBill } from '../types'

export type PaymentCounts = Record<BatchBillStatus, number>

export const emptyPaymentCounts = (): PaymentCounts =>
  Object.fromEntries(BATCH_BILL_STATUSES.map((s) => [s, 0])) as PaymentCounts

// How many bills are at each status. Batch and tax bills share one status set.
export function countByStatus(bills: Array<{ status: BatchBillStatus }>): PaymentCounts {
  const counts = emptyPaymentCounts()
  for (const b of bills) counts[b.status] += 1
  return counts
}

// Order Recap's per-batch payment pills: one count per status, per batch.
export function paymentCountsByBatch(batchBills: BatchBill[]): Map<string, PaymentCounts> {
  const map = new Map<string, PaymentCounts>()
  for (const bill of batchBills) {
    const counts = map.get(bill.batchId) ?? emptyPaymentCounts()
    counts[bill.status] += 1
    map.set(bill.batchId, counts)
  }
  return map
}

// A tax bill is overdue once a full day past its deadline and not Lunas —
// the same moment Tax Bills' DeadlineBadge switches to "Overdue N hari".
export function isTaxOverdue(t: TaxBill): boolean {
  return t.status !== 'Lunas' && daysRemaining(t.deadline) < 0
}

// The N in "Overdue N hari"; 0 when not overdue.
export function taxDaysOverdue(t: TaxBill): number {
  return Math.max(0, -daysRemaining(t.deadline))
}

// What the customer owes on a tax bill: product tax plus any late fee.
export const taxAmountDue = (t: TaxBill) => t.total + t.lateFeeIDR
