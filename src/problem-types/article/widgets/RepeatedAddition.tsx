import { useEffect, useState } from 'react'
import { repeatedAdditionConfigSchema } from '../schema'

interface RepeatedAdditionProps {
  config: unknown
  onComplete?: () => void
}

// Does the user prefer reduced motion? When true we skip the slide-in of each
// dropped term. Guarded so it works in non-browser test envs.
function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

// Tedium demo: the learner DRAGS "+N" blocks into the equation, one at a time,
// until the running total reaches the goal (value × target, e.g. 3+3+3+3+3=15).
// Having to repeat the same drag over and over is the point — it sets up why we
// want loops. A click is an accessible fallback for keyboard / no-drag users.
export function RepeatedAddition({ config, onComplete }: RepeatedAdditionProps) {
  const { value, target, caption } = repeatedAdditionConfigSchema.parse(config)
  const [reduced] = useState(prefersReducedMotion)
  const [count, setCount] = useState(0)
  // True only while a "+N" chip is mid-drag (so a drop works where dataTransfer
  // is unavailable, e.g. jsdom).
  const [dragging, setDragging] = useState(false)

  const goal = value * target
  const sum = value * count
  const done = count >= target

  useEffect(() => {
    if (done) onComplete?.()
  }, [done, onComplete])

  function addTerm() {
    setCount((c) => Math.min(c + 1, target))
    setDragging(false)
  }

  const terms = Array.from({ length: count }, () => value)

  return (
    <div
      className="widget widget-repeated-addition"
      data-widget="repeated_addition"
      data-motion={reduced ? 'reduced' : 'full'}
    >
      <p className="ra-goal muted">
        Drag <strong>+{value}</strong> blocks into the equation until the total reaches{' '}
        <strong>{goal}</strong>.
      </p>

      <button
        type="button"
        className="ra-chip"
        draggable={!done}
        aria-label={`drag + ${value}`}
        onDragStart={() => setDragging(true)}
        onDragEnd={() => setDragging(false)}
        onClick={addTerm}
        disabled={done}
      >
        + {value}
      </button>

      <div
        className="ra-equation"
        aria-label="equation"
        aria-live="polite"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault()
          if (dragging) addTerm()
        }}
      >
        {count === 0 ? (
          <span className="ra-empty">0</span>
        ) : (
          <span className="ra-terms">
            {terms.map((t, i) => (
              <span className="ra-term" key={i}>
                {i > 0 && <span className="ra-plus"> + </span>}
                {t}
              </span>
            ))}
            {' = '}
            <strong className="ra-sum">{sum}</strong>
          </span>
        )}
      </div>

      <div className="ra-controls">
        <button type="button" className="ghost" onClick={() => setCount(0)} disabled={count === 0}>
          Reset
        </button>
        <span className="ra-count">
          {count} / {target} blocks · total {sum}
        </span>
      </div>

      {caption && <p className="widget-caption">{caption}</p>}
      {done && (
        <p role="status" className="feedback feedback-correct">
          Phew — you added {value} the same way {target} times to reach {goal}. Doing the exact same
          thing over and over is tedious. There has to be a faster way…
        </p>
      )}
    </div>
  )
}
