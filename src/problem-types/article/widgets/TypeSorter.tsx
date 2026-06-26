import { useEffect, useState } from 'react'
import { typeSorterConfigSchema } from '../schema'
import { WidgetFrame } from './WidgetFrame'
import { useReducedMotion } from '../../../lib/ui/motion'

interface Props {
  config: unknown
  onComplete?: () => void
}

// Sort each value into "number" or "text". Built like the word game in *Keep
// Talking and Nobody Explodes*: the word to sort sits in a LARGE CENTRAL BOX and
// the answers are SMALLER BUTTONS below it. A correct answer sends the word
// sliding OFF TO THE LEFT while the next word slides IN FROM THE RIGHT. Builds
// the distinction between a number (you can do math with it) and a string (text
// in quotes). Respects prefers-reduced-motion (instant swap, no slide).
export function TypeSorter({ config, onComplete }: Props) {
  const { items, caption } = typeSorterConfigSchema.parse(config)
  const reduced = useReducedMotion()
  const [index, setIndex] = useState(0)
  // A word that has just been answered and is sliding away (decorative only).
  const [leaving, setLeaving] = useState<{ label: string; key: number } | null>(null)
  const [wrong, setWrong] = useState(false)
  // Bumped on each wrong pick so the incorrect banner re-keys and replays its
  // shake, even when the learner taps the same wrong bucket again.
  const [wrongAttempts, setWrongAttempts] = useState(0)

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
      setWrongAttempts((a) => a + 1)
    }
  }

  const status = done ? 'done' : index > 0 ? 'running' : 'idle'

  return (
    <WidgetFrame
      kind="type_sorter"
      icon="🗂️"
      title="Type Sorter"
      status={status}
      reduced={reduced}
      className={`widget-type-sorter${wrong ? ' is-wrong' : ''}`}
      caption={caption}
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
          <button type="button" className="btn-machine" onClick={() => choose('number')}>
            number
          </button>
          <button type="button" className="btn-machine" onClick={() => choose('text')}>
            text
          </button>
        </div>
      )}

      {wrong && !done && (
        <p key={wrongAttempts} role="alert" className="feedback feedback-incorrect">
          Not that bucket — look again: is it written in quotes, or is it a plain value you could do math with?
        </p>
      )}

      <p className="ts-progress">
        {Math.min(index, items.length)} / {items.length}
      </p>

      {done && (
        <p role="status" className="feedback feedback-correct">
          Nice sorting! Numbers do math; text in quotes is a string.
        </p>
      )}
    </WidgetFrame>
  )
}
