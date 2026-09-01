// Admin GO's real LINE broadcast template for a batch payment call-out.
// Payment channels/terms are the business's fixed values; batch number,
// order type, and the per-customer amount lines are filled in per batch.
export function buildTagihanTemplate(params: {
  batchNumber: string
  orderType: string
  customerLines: string[]
}): string {
  return [
    `${params.batchNumber} 🇯🇵  | ${params.orderType} - G`,
    '',
    '',
    ...params.customerLines,
    '',
    '',
    '📁 QRIS ADA DI ALBUM / NOTE 📂',
    'E-Wallet : 🍥',
    '',
    'Shopeepay - 081211891305 an D',
    'Dana - 081211891305 an M',
    'Gopay - 081211891305 an ML',
    '',
    'Bank : ✨',
    'BCA - 7120646383 an ML',
    'Sea Bank - 901917729051 an ML',
    '',
    '',
    '❌ batas waktu pembayaran 1x6 jam, Jika melewati batas waktu payment akan dikenakan denda 3k/hari ❌',
    '',
    'LINK REKAPAN JAJAN:',
    'https://docs.google.com/spreadsheets/d/1VucjJFJTfIiWvQg-qREAVNVWuCy0W8Gm7yzoh9he404/edit?usp=drivesdk',
    '',
    '¡! Drop bukti payment ',
    '¡! Jika ada kendala bisa pc salah satu admin',
    '¡! Jangan hnr, bisa cari opslot tinggal komen aja',
  ].join('\n')
}
