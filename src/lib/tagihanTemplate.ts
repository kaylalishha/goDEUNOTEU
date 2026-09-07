// Admin GO's real LINE broadcast template for a batch payment call-out.
// Rather than listing every payment channel inline, each customer is
// tagged by their LINE display name (token: ${dnLINE}) and pointed to the
// web dashboard to check their bill and pay.
export function buildTagihanTemplate(params: {
  batchNumber: string
  orderType: string
  customerNames: string[]
}): string {
  const mentionLines = params.customerNames.map((dnLINE) => `@${dnLINE}`)

  return [
    `${params.batchNumber} 🇯🇵  | ${params.orderType} - G`,
    '',
    '',
    ...mentionLines,
    '',
    '',
    '📌 Cek tagihan & cara bayar kalian di website GO Aikatsu ya!',
    '🔗 https://go-deunoteu.vercel.app',
    '',
    '',
    '❌ batas waktu pembayaran 1x6 jam, Jika melewati batas waktu payment akan dikenakan denda 3k/hari ❌',
    '',
    'LINK REKAPAN JAJAN:',
    'https://docs.google.com/spreadsheets/d/1VucjJFJTfIiWvQg-qREAVNVWuCy0W8Gm7yzoh9he404/edit?usp=drivesdk',
    '',
    '¡! Jika ada kendala bisa pc salah satu admin',
    '¡! Jangan hnr, bisa cari opslot tinggal komen aja',
  ].join('\n')
}
