import { useEffect, useState } from 'react'
import { repeatedAdditionConfigSchema } from '../schema'

interface RepeatedAdditionProps {
  config: unknown
  onComplete?: () => void
}

// Hook widget: tap to add the same number again and again, watching the sum
// grow. This builds the intuition that a loop is "do the same thing N times".
export function RepeatedAddition({ config, onComplete }: RepeatedAdditionProps) {
  const { value, target, caption } = repeatedAdditionConfigSchema.parse(config)
  const [count, setCount] = useState(0)
  const done = count >= target

  useEffect(() => {
    if (done) onComplete?.()
  }, [done, onComplete])

  const terms = Array.from({ length: count }, () => value)
  const sum = value * count

  return (
    <div className="widget widget-repeated-addition" data-widget="repeated_addition">
      <div className="ra-expression" aria-live="polite">
        {count === 0 ? <span className="ra-empty">0</span> : terms.join(' + ')}
        {count > 0 && (
          <>
            {' = '}
            <strong>{sum}</strong>
          </>
        )}
      </div>

      <div className="ra-controls">
        <button type="button" onClick={() => setCount((c) => Math.min(c + 1, target))} disabled={done}>
          + {value}
        </button>
        <button type="button" className="ghost" onClick={() => setCount(0)} disabled={count === 0}>
          Reset
        </button>
        <span className="ra-count">
          {count} / {target} times
        </span>
      </div>

      {caption && <p className="widget-caption">{caption}</p>}
      {done && (
        <p role="status" className="feedback feedback-correct">
          You added {value}, {target} times — that&apos;s {value} × {target} = {sum}. A loop does
          exactly this for you.
        </p>
      )}
    </div>
  )
}
