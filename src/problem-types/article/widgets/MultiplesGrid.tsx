import { useEffect, useState } from 'react'
import { multiplesGridConfigSchema } from '../schema'
import { WidgetFrame } from './WidgetFrame'
import { useReducedMotion } from '../../../lib/ui/motion'

interface Props {
  config: unknown
  onComplete?: () => void
}

// A 1..upTo grid where the learner taps every multiple of `factor`. Completing
// it (all multiples found, none wrong) reinforces what "multiple of k" means and
// connects to `n % factor == 0`.
export function MultiplesGrid({ config, onComplete }: Props) {
  const { upTo, factor, caption } = multiplesGridConfigSchema.parse(config)
  const reduced = useReducedMotion()
  const [picked, setPicked] = useState<Set<number>>(new Set())

  const numbers = Array.from({ length: upTo }, (_, i) => i + 1)
  const multiples = numbers.filter((n) => n % factor === 0)
  const allFound =
    multiples.every((m) => picked.has(m)) && [...picked].every((p) => p % factor === 0)

  useEffect(() => {
    if (allFound && picked.size > 0) onComplete?.()
  }, [allFound, picked.size, onComplete])

  function toggle(n: number) {
    setPicked((prev) => {
      const next = new Set(prev)
      if (next.has(n)) next.delete(n)
      else next.add(n)
      return next
    })
  }

  const status = allFound && picked.size > 0 ? 'done' : picked.size > 0 ? 'running' : 'idle'

  return (
    <WidgetFrame
      kind="multiples_grid"
      icon="🔢"
      title="Multiples Grid"
      status={status}
      reduced={reduced}
      className="widget-multiples-grid"
      caption={caption}
    >
      <p className="mg-instruction">Tap every multiple of {factor}.</p>
      <div className="mg-grid" role="group" aria-label={`numbers 1 to ${upTo}`}>
        {numbers.map((n) => {
          const on = picked.has(n)
          const wrong = on && n % factor !== 0
          return (
            <button
              key={n}
              type="button"
              className={`mg-cell${on ? ' is-on' : ''}${wrong ? ' is-wrong' : ''}`}
              aria-pressed={on}
              onClick={() => toggle(n)}
            >
              {n}
            </button>
          )
        })}
      </div>

      {allFound && picked.size > 0 && (
        <p role="status" className="feedback feedback-correct">
          Those are the multiples of {factor} — each one has remainder 0 when divided by {factor}.
        </p>
      )}
    </WidgetFrame>
  )
}
