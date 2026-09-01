// Domain model for GO Aikatsu — Admin Dashboard
// Field shapes follow the PRD's Functional Requirements (FR-GO-A/B/C/D-xxx).

export const TIPE_BARANG_OPTIONS = [
  'Kartu',
  'Ganci',
  'Binder',
  'Boneka',
  'Sleeve',
  'Standee',
  'Lainnya',
] as const
export type TipeBarang = (typeof TIPE_BARANG_OPTIONS)[number]

export const TIPE_KARTU_OPTIONS = [
  'Tops',
  'Skirt',
  'Shoes',
  'Set',
  'Accessories',
  'Dress',
] as const
export type TipeKartu = (typeof TIPE_KARTU_OPTIONS)[number]

// Order status reflects the parties named in the PRD executive summary
// (Mercari Seller → WH Japan → Bea Cukai → WH Indonesia → Customer).
export const ORDER_STATUS_OPTIONS = [
  'Menunggu Pembayaran ke Seller',
  'Dibeli dari Seller',
  'Di WH Jepang',
  'Dikirim ke Indonesia',
  'Di Bea Cukai',
  'Di WH Indonesia',
  'Selesai',
] as const
export type OrderStatus = (typeof ORDER_STATUS_OPTIONS)[number]

export const BATCH_BILL_STATUSES = [
  'Belum Lunas',
  'Menunggu Konfirmasi',
  'Lunas',
] as const
export type BatchBillStatus = (typeof BATCH_BILL_STATUSES)[number]

export const TAX_BILL_STATUSES = [
  'Belum Bayar',
  'Menunggu Konfirmasi',
  'Lunas',
] as const
export type TaxBillStatus = (typeof TAX_BILL_STATUSES)[number]

export const SERVICE_FEE_TYPES = ['flat', 'percentage'] as const
export type ServiceFeeType = (typeof SERVICE_FEE_TYPES)[number]

export const KARTU_FLAT_TAX_IDR = 5000
export const TAX_PAYMENT_WINDOW_DAYS = 7

export interface Customer {
  id: string
  name: string
}

export interface BuktiTransfer {
  fileName: string
  dataUrl: string
  uploadedAt: string
}

// FR-GO-A-001: one submitted recap form = one Batch = one order/invoice
// link back to the seller. A Batch can hold items for several customers.
export interface Batch {
  id: string
  batchNumber: string
  boxNumber: string
  photoDataUrl?: string
  upnotesTotal: number
  orderStatus: OrderStatus
  createdAt: string
  updatedAt: string
}

export interface Item {
  id: string
  batchId: string
  customerId: string
  tipeBarang: TipeBarang
  tipeKartu?: TipeKartu
  priceJPY: number
  priceIDR: number
  weightGrams?: number
  createdAt: string
  updatedAt: string
}

export interface BatchBill {
  id: string
  batchId: string
  batchNumber: string
  customerId: string
  itemIds: string[]
  upnotesTotal: number
  bankAccount: string
  total: number
  status: BatchBillStatus
  createdAt: string
  paidAt?: string
  buktiTransfer?: BuktiTransfer
}

export interface TaxBill {
  id: string
  boxNumber: string
  customerId: string
  kartuCount: number
  kartuTax: number
  nonKartuWeightGrams: number
  nonKartuShare: number
  total: number
  publishedAt: string
  deadline: string
  status: TaxBillStatus
  buktiTransfer?: BuktiTransfer
}

export interface EstimatorConfig {
  exchangeRate: number
  serviceFeeType: ServiceFeeType
  serviceFeeValue: number
  updatedAt: string
}
