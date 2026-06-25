import { useEffect, useState } from 'react'
import { typeSorterConfigSchema } from '../schema'

interface Props {
  config: unknown
  onComplete?: () => void
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

// Sort each value into "number" or "text". Built like the word game in *Keep
// Talking and Nobody Explodes*: the word to sort sits in a LARGE CENTRAL BOX and
// the answers are SMALLER BUTTONS below it. A correct answer sends the word
// sliding OFF TO THE LEFT while the next word slides IN FROM THE RIGHT. Builds
// the distinction between a number (you can do math with it) and a string (text
// in quotes). Respects prefers-reduced-motion (instant swap, no slide).
export function TypeSorter({ config, onComplete }: Props) {
  const { items, caption } = typeSorterConfigSchema.parse(config)
  const [reduced] = useState(prefersReducedMotion)
  const [index, setIndex] = useState(0)
  // A word that has just been answered and is sliding away (decorative only).
  const [leaving, setLeaving] = useState<{ label: string; key: number } | null>(null)
  const [wrong, setWrong] = useState(false)

  const done = index >= items.length

  useEffect(() => {
    if (done) onComplete?.()
  }, [done, onComplete])

  const current = done ? null : items[index]

  function choose(bucket: 'number' | 'text') {
    if (!current) return
    if (bucket === current.type) {
      if (!reduced) setLeaving({ label: current.label, key: index })
      setWrong(false)
      setIndex((i) => i + 1)
    } else {
      setWrong(true)
    }
  }

  return (
    <div
      className={`widget widget-type-sorter${wrong ? ' is-wrong' : ''}`}
      data-widget="type_sorter"
      data-motion={reduced ? 'reduced' : 'full'}
    >
      <div className="ts-stage">
        {leaving && (
          <code
            className="ts-leaving"
            key={`leaving-${leaving.key}`}
            aria-hidden="true"
            onAnimationEnd={() => setLeaving(null)}
          >
            {leaving.label}
          </code>
        )}
        {current ? (
          <code className="ts-current" key={`current-${index}`} aria-live="polite">
            {current.label}
          </code>
        ) : (
          <span className="ts-current ts-done" aria-live="polite">
            ✓
          </span>
        )}
      </div>

      {!done && (
        <div className="ts-buttons">
          <button type="button" onClick={() => choose('number')}>
            number
          </button>
          <button type="button" onClick={() => choose('text')}>
            text
          </button>
        </div>
      )}

      {wrong && !done && (
        <p role="alert" className="feedback feedback-incorrect">
          Not that bucket — look again: is it written in quotes, or is it a plain value you could do math with?
        </p>
      )}

      <p className="ts-progress">
        {Math.min(index, items.length)} / {items.length}
      </p>

      {caption && <p className="widget-caption">{caption}</p>}
      {done && (
        <p role="status" className="feedback feedback-correct">
          Nice sorting! Numbers do math; text in quotes is a string.
        </p>
      )}
    </div>
  )
}
