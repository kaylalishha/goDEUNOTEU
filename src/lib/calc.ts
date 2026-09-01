import { KARTU_FLAT_TAX_IDR, type EstimatorConfig } from '../types'

export interface TaxCalcItemInput {
  customerId: string
  isKartu: boolean
  weightGrams?: number
}

export interface TaxCalcCustomerBreakdown {
  customerId: string
  kartuCount: number
  kartuTax: number
  nonKartuWeightGrams: number
  nonKartuShare: number
  total: number
}

export interface TaxCalcResult {
  breakdown: TaxCalcCustomerBreakdown[]
  totalKartuTax: number
  remainingTaxAfterKartu: number
  totalNonKartuWeightGrams: number
}

// FR-GO-C-001: Kartu items -> flat Rp 5.000 per kartu item.
// Non-kartu items -> proportional share of (total tax - kartu tax) by weight.
export function calculateTaxShares(
  items: TaxCalcItemInput[],
  totalTaxIdr: number,
): TaxCalcResult {
  const kartuCountByCustomer = new Map<string, number>()
  const nonKartuWeightByCustomer = new Map<string, number>()
  let totalKartuCount = 0
  let totalNonKartuWeightGrams = 0

  for (const item of items) {
    if (item.isKartu) {
      kartuCountByCustomer.set(
        item.customerId,
        (kartuCountByCustomer.get(item.customerId) ?? 0) + 1,
      )
      totalKartuCount += 1
    } else {
      const weight = item.weightGrams ?? 0
      nonKartuWeightByCustomer.set(
        item.customerId,
        (nonKartuWeightByCustomer.get(item.customerId) ?? 0) + weight,
      )
      totalNonKartuWeightGrams += weight
    }
  }

  const totalKartuTax = totalKartuCount * KARTU_FLAT_TAX_IDR
  const remainingTaxAfterKartu = Math.max(totalTaxIdr - totalKartuTax, 0)

  const customerIds = new Set<string>([
    ...kartuCountByCustomer.keys(),
    ...nonKartuWeightByCustomer.keys(),
  ])

  const breakdown: TaxCalcCustomerBreakdown[] = [...customerIds].map(
    (customerId) => {
      const kartuCount = kartuCountByCustomer.get(customerId) ?? 0
      const kartuTax = kartuCount * KARTU_FLAT_TAX_IDR
      const nonKartuWeightGrams = nonKartuWeightByCustomer.get(customerId) ?? 0
      const nonKartuShare =
        totalNonKartuWeightGrams > 0
          ? (nonKartuWeightGrams / totalNonKartuWeightGrams) * remainingTaxAfterKartu
          : 0
      return {
        customerId,
        kartuCount,
        kartuTax,
        nonKartuWeightGrams,
        nonKartuShare,
        total: kartuTax + nonKartuShare,
      }
    },
  )

  return {
    breakdown,
    totalKartuTax,
    remainingTaxAfterKartu,
    totalNonKartuWeightGrams,
  }
}

// FR-GO-3-001 / FR-GO-D-001: rough customs-tax placeholder used only for the
// Admin-side estimator preview (Customer Feature 3 itself is out of scope
// for this dashboard). Threshold/rate are illustrative and not specified by
// the PRD — they are not part of the Admin-configurable values.
const DE_MINIMIS_THRESHOLD_IDR = 3_000_000
const ROUGH_TAX_RATE = 0.075

export interface EstimateBreakdown {
  hargaProdukIdr: number
  serviceFee: number
  estimasiPajak: number
  total: number
}

export function calculateEstimate(
  priceJpy: number,
  config: EstimatorConfig,
): EstimateBreakdown {
  const hargaProdukIdr = priceJpy * config.exchangeRate
  const serviceFee =
    config.serviceFeeType === 'flat'
      ? config.serviceFeeValue
      : hargaProdukIdr * (config.serviceFeeValue / 100)
  const estimasiPajak =
    hargaProdukIdr <= DE_MINIMIS_THRESHOLD_IDR
      ? 0
      : (hargaProdukIdr - DE_MINIMIS_THRESHOLD_IDR) * ROUGH_TAX_RATE

  return {
    hargaProdukIdr,
    serviceFee,
    estimasiPajak,
    total: hargaProdukIdr + serviceFee + estimasiPajak,
  }
}
