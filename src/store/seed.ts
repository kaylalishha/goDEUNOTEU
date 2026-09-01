import type { BatchBill, Customer, EstimatorConfig, Item, TaxBill } from '../types'

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

export const seedItems: Item[] = [
  {
    id: 'item_001',
    boxNumber: 'BOX-001',
    batchNumber: 'BATCH-01',
    customerId: 'cust_aiko',
    tipeBarang: 'Kartu',
    tipeKartu: 'Tops',
    priceJPY: 800,
    priceIDR: 96000,
    photoDataUrl: undefined,
    upnotes: 5000,
    orderStatus: 'Di WH Indonesia',
    createdAt: daysAgoIso(12),
    updatedAt: daysAgoIso(10),
  },
  {
    id: 'item_002',
    boxNumber: 'BOX-001',
    batchNumber: 'BATCH-01',
    customerId: 'cust_aiko',
    tipeBarang: 'Kartu',
    tipeKartu: 'Set',
    priceJPY: 1500,
    priceIDR: 180000,
    upnotes: undefined,
    orderStatus: 'Di WH Indonesia',
    createdAt: daysAgoIso(12),
    updatedAt: daysAgoIso(12),
  },
  {
    id: 'item_003',
    boxNumber: 'BOX-001',
    batchNumber: 'BATCH-01',
    customerId: 'cust_bunga',
    tipeBarang: 'Boneka',
    priceJPY: 3200,
    priceIDR: 384000,
    upnotes: 10000,
    orderStatus: 'Di WH Indonesia',
    weightGrams: 420,
    createdAt: daysAgoIso(12),
    updatedAt: daysAgoIso(9),
  },
  {
    id: 'item_004',
    boxNumber: 'BOX-001',
    batchNumber: 'BATCH-01',
    customerId: 'cust_citra',
    tipeBarang: 'Binder',
    priceJPY: 2100,
    priceIDR: 252000,
    orderStatus: 'Di WH Indonesia',
    weightGrams: 310,
    createdAt: daysAgoIso(11),
    updatedAt: daysAgoIso(11),
  },
  {
    id: 'item_005',
    boxNumber: 'BOX-001',
    batchNumber: 'BATCH-01',
    customerId: 'cust_citra',
    tipeBarang: 'Kartu',
    tipeKartu: 'Dress',
    priceJPY: 900,
    priceIDR: 108000,
    orderStatus: 'Di WH Indonesia',
    createdAt: daysAgoIso(11),
    updatedAt: daysAgoIso(11),
  },
  {
    id: 'item_006',
    boxNumber: 'BOX-002',
    batchNumber: 'BATCH-02',
    customerId: 'cust_dewi',
    tipeBarang: 'Standee',
    priceJPY: 2600,
    priceIDR: 312000,
    orderStatus: 'Di Bea Cukai',
    weightGrams: 560,
    createdAt: daysAgoIso(4),
    updatedAt: daysAgoIso(4),
  },
  {
    id: 'item_007',
    boxNumber: 'BOX-002',
    batchNumber: 'BATCH-02',
    customerId: 'cust_eka',
    tipeBarang: 'Kartu',
    tipeKartu: 'Shoes',
    priceJPY: 700,
    priceIDR: 84000,
    orderStatus: 'Di Bea Cukai',
    createdAt: daysAgoIso(4),
    updatedAt: daysAgoIso(4),
  },
  {
    id: 'item_008',
    batchNumber: 'BATCH-03',
    customerId: 'cust_bunga',
    tipeBarang: 'Ganci',
    priceJPY: 500,
    priceIDR: 60000,
    orderStatus: 'Menunggu Pembayaran ke Seller',
    createdAt: daysAgoIso(1),
    updatedAt: daysAgoIso(1),
  },
]

export const seedBatchBills: BatchBill[] = [
  {
    id: 'bbill_001',
    batchNumber: 'BATCH-01',
    customerId: 'cust_aiko',
    itemIds: ['item_001', 'item_002'],
    upnotesTotal: 5000,
    bankAccount: 'BCA 1234567890 a.n. Admin GO Aikatsu',
    total: 96000 + 180000 + 5000,
    status: 'Lunas',
    createdAt: daysAgoIso(10),
    buktiTransfer: {
      fileName: 'bukti_aiko_batch01.png',
      dataUrl: PLACEHOLDER_RECEIPT,
      uploadedAt: daysAgoIso(9),
    },
  },
  {
    id: 'bbill_002',
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
    },
  },
  {
    id: 'bbill_003',
    batchNumber: 'BATCH-01',
    customerId: 'cust_citra',
    itemIds: ['item_004', 'item_005'],
    upnotesTotal: 0,
    bankAccount: 'BCA 1234567890 a.n. Admin GO Aikatsu',
    total: 252000 + 108000,
    status: 'Belum Lunas',
    createdAt: daysAgoIso(9),
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
