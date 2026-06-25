// "Sparks" is the in-app currency (cosmetic rebrand of points). The sparkle
// glyph + amount are reused across the nav, account menu, and results page.

import { formatCurrency } from '../lib/ui/currency'

export const CURRENCY_NAME = 'Sparks'
export const CURRENCY_GLYPH = '✦'

export function Currency({ amount, className }: { amount: number; className?: string }) {
  return (
    <span className={`currency${className ? ` ${className}` : ''}`} title={CURRENCY_NAME}>
      <span className="currency-icon" aria-hidden="true">
        {CURRENCY_GLYPH}
      </span>
      <span className="currency-amount">{formatCurrency(amount)}</span>
    </span>
  )
}
