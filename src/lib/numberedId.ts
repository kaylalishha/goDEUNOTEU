// Batch/box numbers are standardized as an integer suffix on a fixed
// prefix (e.g. "BATCH-01", "BOX-001"), entered via a number-only input.
export const BATCH_NUMBER_PREFIX = 'BATCH'
export const BOX_NUMBER_PREFIX = 'BOX'

export function extractNumber(prefixed: string | undefined, prefix: string): number | '' {
  if (!prefixed) return ''
  const match = prefixed.match(new RegExp(`^${prefix}-?(\\d+)$`, 'i'))
  return match ? Number(match[1]) : ''
}

export function formatWithPrefix(prefix: string, value: number | '', padLength: number): string | undefined {
  if (value === '' || !Number.isInteger(value) || value <= 0) return undefined
  return `${prefix}-${String(value).padStart(padLength, '0')}`
}
