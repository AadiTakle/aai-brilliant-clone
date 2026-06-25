/** Locale-aware grouping (e.g. 1,234) instead of a raw number. */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat(undefined).format(amount)
}
