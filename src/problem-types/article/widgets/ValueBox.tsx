import { useEffect, useState } from 'react'
import { valueBoxConfigSchema } from '../schema'
import { WidgetFrame } from './WidgetFrame'
import { useReducedMotion } from '../../../lib/ui/motion'

interface Props {
  config: unknown
  onComplete?: () => void
}

// An interactive variable box. A few PRESET values sit above a labelled box; the
// learner DRAGS one into the box. On drop the value slides into the box from
// above and the box's displayed value updates — dropping a new value overwrites
// the old one. That overwrite is the whole point: a variable only ever holds the
// most recent value. Reusable for numbers and text (valueType 'string' shows
// quotes). Respects prefers-reduced-motion (instant snap, no slide).
export function ValueBox({ config, onComplete }: Props) {
  const { name, options, valueType, requiredDrops, caption } = valueBoxConfigSchema.parse(config)
  const reduced = useReducedMotion()
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

  const status = done ? 'done' : drops > 0 ? 'running' : 'idle'

  return (
    <WidgetFrame
      kind="value_box"
      icon="📦"
      title="Value Box"
      status={status}
      reduced={reduced}
      className="widget-value-box"
      caption={caption}
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

      {done && (
        <p role="status" className="feedback feedback-correct">
          The box only ever holds the most recent value — each new value you drop in replaces the old one.
        </p>
      )}
    </WidgetFrame>
  )
}
