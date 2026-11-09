import { PAYMENT_METHOD_OPTIONS, type PaymentMethod } from './shared/types'

// Business settings the PRD leaves open ("Open Gaps"). Each one is a
// placeholder until Admin GO decides; change it here, not in page code.

// FR-GO-PAY-002: payment instructions per method. The MVP has no
// admin-maintained source for these yet, so change them here. `logoSrc` is
// the button logo and `imageSrc` an extra image (e.g. the QRIS code); both
// are files in public/.
export const PAYMENT_INSTRUCTIONS: Record<PaymentMethod, { title: string; logoSrc: string; lines: string[]; imageSrc?: string }> = {
  QRIS: {
    title: 'QRIS',
    logoSrc: '/payment/logos/qris.png',
    lines: ['Scan kode QRIS DEUNOTEU GO di bawah ini.', 'Bayar dari HP ini? Simpan gambarnya, lalu upload di aplikasi e-wallet / m-banking kamu.'],
    imageSrc: '/payment/qris-deunoteu.jpg',
  },
  Shopeepay: { title: 'ShopeePay', logoSrc: '/payment/logos/shopeepay.png', lines: ['Transfer ke ShopeePay 081211891305.', 'a.n. D'] },
  DANA: { title: 'DANA', logoSrc: '/payment/logos/dana.png', lines: ['Transfer ke DANA 081211891305.', 'a.n. M'] },
  GoPay: { title: 'GoPay', logoSrc: '/payment/logos/gopay.png', lines: ['Transfer ke GoPay 081211891305.', 'a.n. ML'] },
  BCA: { title: 'Bank BCA', logoSrc: '/payment/logos/bca.png', lines: ['No. rekening 7120646383.', 'a.n. ML'] },
  SeaBank: { title: 'SeaBank', logoSrc: '/payment/logos/seabank.png', lines: ['No. rekening 901917729051.', 'a.n. ML'] },
}

export const BATCH_PAYMENT_METHODS: PaymentMethod[] = [...PAYMENT_METHOD_OPTIONS]
// FR-GO-2-006: the admin's tax LINE template says "PAYMENT HANYA MELALUI QRIS".
export const TAX_PAYMENT_METHODS: PaymentMethod[] = ['QRIS']

// FR-GO-PAY-003: proof upload limit. TODO: confirm the real limit.
export const MAX_PROOF_MB = 5

// FR-GO-2-005: "tax can be paid once the batch is fully paid". Not decided
// yet; while false, tax bills can be paid regardless and the rule is not shown.
export const TAX_REQUIRES_PAID_BATCH = false
