import { useEffect, useRef, useState } from 'react'
import { useCountUp } from './useCountUp'
import { CURRENCY_GLYPH, CURRENCY_NAME } from './Currency'

/**
 * Sparks total that animates when it grows: a floating "+N" rises from below
 * into the total, which then counts up to the new value.
 */
export function AnimatedCurrency({ amount }: { amount: number }) {
  const display = useCountUp(amount)
  const prevRef = useRef(amount)
  const [gain, setGain] = useState<{ delta: number; key: number } | null>(null)

  useEffect(() => {
    const prev = prevRef.current
    if (amount > prev) {
      setGain((g) => ({ delta: amount - prev, key: (g?.key ?? 0) + 1 }))
    }
    prevRef.current = amount
  }, [amount])

  return (
    <span className="currency currency-animated" title={CURRENCY_NAME}>
      <span className="currency-icon" aria-hidden="true">
        {CURRENCY_GLYPH}
      </span>
      <span className="currency-amount">{display}</span>
      {gain && (
        <span key={gain.key} className="currency-gain" aria-hidden="true">
          +{gain.delta}
        </span>
      )}
    </span>
  )
}
