import { PAYMENT_METHOD_OPTIONS, type PaymentMethod } from './shared/types'

// Business settings the PRD leaves open ("Open Gaps"). Each one is a
// placeholder until Admin GO decides; change it here, not in page code.

// FR-GO-PAY-002: payment instructions per method. TODO: real account
// numbers / QRIS image. The MVP has no admin-maintained source for these yet.
export const PAYMENT_INSTRUCTIONS: Record<PaymentMethod, { title: string; lines: string[] }> = {
  QRIS: { title: 'QRIS', lines: ['Scan kode QRIS GO DEUNOTEU.', '[Gambar QRIS menyusul]'] },
  Shopeepay: { title: 'ShopeePay', lines: ['Transfer ke ShopeePay [nomor].', 'a.n. [nama pemilik]'] },
  DANA: { title: 'DANA', lines: ['Transfer ke DANA [nomor].', 'a.n. [nama pemilik]'] },
  GoPay: { title: 'GoPay', lines: ['Transfer ke GoPay [nomor].', 'a.n. [nama pemilik]'] },
  BCA: { title: 'Bank BCA', lines: ['No. rekening [nomor rekening].', 'a.n. [nama pemilik]'] },
  SeaBank: { title: 'SeaBank', lines: ['No. rekening [nomor rekening].', 'a.n. [nama pemilik]'] },
}

export const BATCH_PAYMENT_METHODS: PaymentMethod[] = [...PAYMENT_METHOD_OPTIONS]
// FR-GO-2-006: the admin's tax LINE template says "PAYMENT HANYA MELALUI QRIS".
export const TAX_PAYMENT_METHODS: PaymentMethod[] = ['QRIS']

// FR-GO-PAY-003: proof upload limit. TODO: confirm the real limit.
export const MAX_PROOF_MB = 5

// FR-GO-2-005: "tax can be paid once the batch is fully paid". Not decided
// yet; while false, tax bills can be paid regardless and the rule is not shown.
export const TAX_REQUIRES_PAID_BATCH = false
