import { useEffect, useState } from 'react'
import { valueBoxConfigSchema } from '../schema'

interface Props {
  config: unknown
  onComplete?: () => void
}

// Does the user prefer reduced motion? When true we skip the slide animation and
// snap the value into place. Guarded so it works in non-browser test envs.
function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

// An interactive variable box. A few PRESET values sit above a labelled box; the
// learner DRAGS one into the box. On drop the value slides into the box from
// above and the box's displayed value updates — dropping a new value overwrites
// the old one. That overwrite is the whole point: a variable only ever holds the
// most recent value. Reusable for numbers and text (valueType 'string' shows
// quotes). Respects prefers-reduced-motion (instant snap, no slide).
export function ValueBox({ config, onComplete }: Props) {
  const { name, options, valueType, requiredDrops, caption } = valueBoxConfigSchema.parse(config)
  const [reduced] = useState(prefersReducedMotion)
  // The value currently held in the box (null = empty), how many drops so far,
  // and which preset is mid-drag (so a drop works even where dataTransfer isn't).
  const [stored, setStored] = useState<string | number | null>(null)
  const [drops, setDrops] = useState(0)
  const [dragging, setDragging] = useState<string | number | null>(null)

  const done = drops >= requiredDrops

  useEffect(() => {
    if (done) onComplete?.()
  }, [done, onComplete])

  const display = (v: string | number) => (valueType === 'string' ? `"${v}"` : String(v))

  function commit(value: string | number) {
    setStored(value)
    setDrops((n) => n + 1)
    setDragging(null)
  }

  return (
    <div
      className="widget widget-value-box"
      data-widget="value_box"
      data-motion={reduced ? 'reduced' : 'full'}
    >
      <div className="vbx-options" aria-label="values to drag">
        {options.map((opt, i) => (
          <button
            key={i}
            type="button"
            className="vbx-chip"
            draggable
            aria-label={`drag ${display(opt)}`}
            onDragStart={() => setDragging(opt)}
            onDragEnd={() => setDragging(null)}
            // Click is an accessible fallback for keyboard / no-drag users.
            onClick={() => commit(opt)}
          >
            {display(opt)}
          </button>
        ))}
      </div>

      <div
        className="vbx-box"
        aria-label={`box ${name}`}
        aria-live="polite"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault()
          if (dragging !== null) commit(dragging)
        }}
      >
        <span className="vbx-name">{name}</span>
        <span className="vbx-slot">
          {stored === null ? (
            <span className="vbx-empty">empty</span>
          ) : (
            // Re-key on every drop so the slide-in animation replays each time.
            <span className="vbx-value" key={drops}>
              {display(stored)}
            </span>
          )}
        </span>
      </div>

      <p className="vbx-statement" aria-live="polite">
        {stored === null ? <code>{name} = ?</code> : <code>{name} = {display(stored)}</code>}
      </p>

      {caption && <p className="widget-caption">{caption}</p>}
      {done && (
        <p role="status" className="feedback feedback-correct">
          The box only ever holds the most recent value — each new value you drop in replaces the old one.
        </p>
      )}
    </div>
  )
}
