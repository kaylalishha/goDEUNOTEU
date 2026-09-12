import { formatDateTime } from './format'

// Admin GO's real LINE broadcast template for a tax bill call-out, mirroring
// buildTagihanTemplate's approach (see tagihanTemplate.ts) — mostly static
// boilerplate specific to this GO's actual messaging style, with the box
// number, customer mentions, and deadline plugged in. The "denda 5k/hari"
// line is still just text here, not derived from a stored late-fee amount —
// there's no such field in the data model yet.
export function buildTaxTagihanTemplate(params: {
  boxNumber: string
  customerNames: string[]
  deadline: string
}): string {
  const mentionLines = params.customerNames.map((dnLINE) => `@${dnLINE}`)

  return [
    `‼️TAGIHAN TAX ${params.boxNumber}, GO DEUNOTEU‼️`,
    '',
    '⬆️ PAYMENT HANYA MELALUI QRIS DI NOTES ⬆️',
    ...mentionLines,
    '',
    '📌 Cek tagihan pajak & cara bayar kalian di website GO Aikatsu ya!',
    '🔗 https://go-deunoteu.vercel.app',
    '',
    'LINK REKAPAN JAJAN:',
    'https://docs.google.com/spreadsheets/d/1VucjJFJTfIiWvQg-qREAVNVWuCy0W8Gm7yzoh9he404/edit?usp=drivesdk',
    '',
    `❌ BATAS PEMBAYARAN TAX ${formatDateTime(params.deadline)}. Jika melewati batas waktu payment akan dikenakan denda 5k/hari ❌`,
    '',
    '¡! Drop bukti payment',
    '¡! Jika ada kendala bisa pc salah satu admin',
    '¡! Jangan hnr, bisa cari opslot tinggal komen aja',
  ].join('\n')
}
