import type { Batch, BatchBill, Customer, EstimatorConfig, Item, TaxBill } from '../types'

const PLACEHOLDER_RECEIPT =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="320" height="420">
      <rect width="320" height="420" fill="#f8fafc"/>
      <rect x="16" y="16" width="288" height="388" fill="#ffffff" stroke="#cbd5e1" stroke-width="2"/>
      <text x="160" y="60" font-family="monospace" font-size="16" text-anchor="middle" fill="#0f172a">BUKTI TRANSFER</text>
      <line x1="32" y1="80" x2="288" y2="80" stroke="#e2e8f0" stroke-width="2"/>
      <text x="32" y="120" font-family="monospace" font-size="12" fill="#334155">Bank BCA</text>
      <text x="32" y="150" font-family="monospace" font-size="12" fill="#334155">Transfer Berhasil</text>
      <text x="32" y="180" font-family="monospace" font-size="12" fill="#334155">Ref: TRX-DEMO-0001</text>
      <rect x="32" y="220" width="256" height="140" fill="#f1f5f9"/>
      <text x="160" y="295" font-family="monospace" font-size="11" text-anchor="middle" fill="#94a3b8">demo attachment</text>
    </svg>
  `)

const PLACEHOLDER_PRODUCT_PHOTO =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="480" height="480">
      <rect width="480" height="480" fill="#fff1f2"/>
      <rect x="24" y="24" width="432" height="432" fill="#ffffff" stroke="#fecdd3" stroke-width="3" stroke-dasharray="10 8"/>
      <text x="240" y="230" font-family="sans-serif" font-size="20" text-anchor="middle" fill="#9f1239">foto product</text>
      <text x="240" y="258" font-family="sans-serif" font-size="13" text-anchor="middle" fill="#fb7185">(yg biasa ada di notes line)</text>
    </svg>
  `)

function daysAgoIso(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString()
}

function daysFromNowIso(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString()
}

export const seedCustomers: Customer[] = [
  { id: 'cust_aiko', name: 'Aiko Pratiwi' },
  { id: 'cust_bunga', name: 'Bunga Lestari' },
  { id: 'cust_citra', name: 'Citra Wulandari' },
  { id: 'cust_dewi', name: 'Dewi Anggraini' },
  { id: 'cust_eka', name: 'Eka Putri' },
]

export const seedBatches: Batch[] = [
  {
    id: 'batch_01',
    batchNumber: 'BATCH-01',
    boxNumber: 'BOX-001',
    orderIdWH: 'WH-2026-0001',
    orderType: 'ReqShare',
    photoDataUrls: [PLACEHOLDER_PRODUCT_PHOTO, PLACEHOLDER_PRODUCT_PHOTO],
    orderStatus: 'Di WH Indonesia',
    createdAt: daysAgoIso(12),
    updatedAt: daysAgoIso(9),
  },
  {
    id: 'batch_02',
    batchNumber: 'BATCH-02',
    boxNumber: 'BOX-002',
    orderIdWH: 'WH-2026-0002',
    orderType: 'ReqShare',
    photoDataUrls: [PLACEHOLDER_PRODUCT_PHOTO],
    orderStatus: 'Di Bea Cukai',
    createdAt: daysAgoIso(4),
    updatedAt: daysAgoIso(4),
  },
  {
    id: 'batch_03',
    batchNumber: 'BATCH-03',
    // demonstrates a batch recorded before its box is known — box number
    // is optional and can be filled in later, during reconciliation
    orderIdWH: 'WH-2026-0003',
    orderType: 'Persod',
    photoDataUrls: [],
    orderStatus: 'Menunggu Pembayaran ke Seller',
    createdAt: daysAgoIso(1),
    updatedAt: daysAgoIso(1),
  },
]

export const seedItems: Item[] = [
  {
    id: 'item_001',
    batchId: 'batch_01',
    customerId: 'cust_aiko',
    tipeBarang: 'Kartu',
    tipeKartu: 'Tops',
    priceIDR: 96000,
    createdAt: daysAgoIso(12),
    updatedAt: daysAgoIso(10),
  },
  {
    id: 'item_002',
    batchId: 'batch_01',
    customerId: 'cust_aiko',
    tipeBarang: 'Kartu',
    tipeKartu: 'Set',
    priceIDR: 180000,
    createdAt: daysAgoIso(12),
    updatedAt: daysAgoIso(12),
  },
  {
    id: 'item_003',
    batchId: 'batch_01',
    customerId: 'cust_bunga',
    tipeBarang: 'Boneka',
    priceIDR: 384000,
    weightGrams: 420,
    createdAt: daysAgoIso(12),
    updatedAt: daysAgoIso(9),
  },
  {
    id: 'item_004',
    batchId: 'batch_01',
    customerId: 'cust_citra',
    tipeBarang: 'Binder',
    priceIDR: 252000,
    weightGrams: 310,
    createdAt: daysAgoIso(11),
    updatedAt: daysAgoIso(11),
  },
  {
    id: 'item_005',
    batchId: 'batch_01',
    customerId: 'cust_citra',
    tipeBarang: 'Kartu',
    tipeKartu: 'Dress',
    priceIDR: 108000,
    createdAt: daysAgoIso(11),
    updatedAt: daysAgoIso(11),
  },
  {
    id: 'item_006',
    batchId: 'batch_02',
    customerId: 'cust_dewi',
    tipeBarang: 'Standee',
    priceIDR: 312000,
    weightGrams: 560,
    createdAt: daysAgoIso(4),
    updatedAt: daysAgoIso(4),
  },
  {
    id: 'item_007',
    batchId: 'batch_02',
    customerId: 'cust_eka',
    tipeBarang: 'Kartu',
    tipeKartu: 'Shoes',
    priceIDR: 84000,
    createdAt: daysAgoIso(4),
    updatedAt: daysAgoIso(4),
  },
  {
    id: 'item_008',
    batchId: 'batch_03',
    customerId: 'cust_bunga',
    tipeBarang: 'Ganci',
    priceIDR: 60000,
    createdAt: daysAgoIso(1),
    updatedAt: daysAgoIso(1),
  },
]

export const seedBatchBills: BatchBill[] = [
  {
    id: 'bbill_001',
    batchId: 'batch_01',
    batchNumber: 'BATCH-01',
    customerId: 'cust_aiko',
    itemIds: ['item_001', 'item_002'],
    upnotesTotal: 5000,
    bankAccount: 'BCA 1234567890 a.n. Admin GO Aikatsu',
    total: 96000 + 180000 + 5000,
    status: 'Dibayar',
    createdAt: daysAgoIso(10),
    paidAt: daysAgoIso(9),
    buktiTransfer: {
      fileName: 'bukti_aiko_batch01.png',
      dataUrl: PLACEHOLDER_RECEIPT,
      uploadedAt: daysAgoIso(9),
      paymentMethod: 'BCA',
    },
  },
  {
    id: 'bbill_002',
    batchId: 'batch_01',
    batchNumber: 'BATCH-01',
    customerId: 'cust_bunga',
    itemIds: ['item_003'],
    upnotesTotal: 10000,
    bankAccount: 'BCA 1234567890 a.n. Admin GO Aikatsu',
    total: 384000 + 10000,
    status: 'Menunggu Konfirmasi',
    createdAt: daysAgoIso(9),
    buktiTransfer: {
      fileName: 'bukti_bunga_batch01.png',
      dataUrl: PLACEHOLDER_RECEIPT,
      uploadedAt: daysAgoIso(1),
      paymentMethod: 'QRIS',
    },
  },
  {
    id: 'bbill_003',
    batchId: 'batch_01',
    batchNumber: 'BATCH-01',
    customerId: 'cust_citra',
    itemIds: ['item_004', 'item_005'],
    upnotesTotal: 0,
    bankAccount: 'BCA 1234567890 a.n. Admin GO Aikatsu',
    total: 252000 + 108000,
    status: 'Belum Dibayar',
    createdAt: daysAgoIso(9),
  },
  {
    id: 'bbill_004',
    batchId: 'batch_02',
    batchNumber: 'BATCH-02',
    customerId: 'cust_dewi',
    itemIds: ['item_006'],
    upnotesTotal: 0,
    bankAccount: 'BCA 1234567890 a.n. Admin GO Aikatsu',
    total: 312000,
    status: 'Belum Dibayar',
    createdAt: daysAgoIso(4),
  },
  {
    id: 'bbill_005',
    batchId: 'batch_02',
    batchNumber: 'BATCH-02',
    customerId: 'cust_eka',
    itemIds: ['item_007'],
    upnotesTotal: 0,
    bankAccount: 'BCA 1234567890 a.n. Admin GO Aikatsu',
    total: 84000,
    status: 'Belum Dibayar',
    createdAt: daysAgoIso(4),
  },
  {
    id: 'bbill_006',
    batchId: 'batch_03',
    batchNumber: 'BATCH-03',
    customerId: 'cust_bunga',
    itemIds: ['item_008'],
    upnotesTotal: 0,
    bankAccount: 'BCA 1234567890 a.n. Admin GO Aikatsu',
    total: 60000,
    status: 'Belum Dibayar',
    createdAt: daysAgoIso(1),
  },
]

export const seedTaxBills: TaxBill[] = [
  {
    id: 'tbill_001',
    boxNumber: 'BOX-001',
    customerId: 'cust_aiko',
    kartuCount: 2,
    kartuTax: 10000,
    nonKartuWeightGrams: 0,
    nonKartuShare: 0,
    total: 10000,
    publishedAt: daysAgoIso(6),
    deadline: daysFromNowIso(1),
    status: 'Belum Bayar',
  },
  {
    id: 'tbill_002',
    boxNumber: 'BOX-001',
    customerId: 'cust_bunga',
    kartuCount: 0,
    kartuTax: 0,
    nonKartuWeightGrams: 420,
    nonKartuShare: 57534,
    total: 57534,
    publishedAt: daysAgoIso(9),
    deadline: daysAgoIso(2),
    status: 'Belum Bayar',
  },
  {
    id: 'tbill_003',
    boxNumber: 'BOX-001',
    customerId: 'cust_citra',
    kartuCount: 1,
    kartuTax: 5000,
    nonKartuWeightGrams: 310,
    nonKartuShare: 42465,
    total: 47465,
    publishedAt: daysAgoIso(9),
    deadline: daysAgoIso(2),
    status: 'Lunas',
    buktiTransfer: {
      fileName: 'bukti_citra_pajak_box001.png',
      dataUrl: PLACEHOLDER_RECEIPT,
      uploadedAt: daysAgoIso(3),
      paymentMethod: 'DANA',
    },
  },
]

export const seedEstimatorConfig: EstimatorConfig = {
  exchangeRate: 105,
  serviceFeeType: 'percentage',
  serviceFeeValue: 10,
  updatedAt: daysAgoIso(20),
}

export const DEMO_RECEIPT_DATA_URL = PLACEHOLDER_RECEIPT
