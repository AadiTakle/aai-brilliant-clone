import { useEffect, useState } from 'react'
import { variableBoxConfigSchema } from '../schema'

interface Props {
  config: unknown
  onComplete?: () => void
}

// A variable shown as a labelled box that holds exactly one value. Storing a new
// value replaces (the box "forgets") the old one — the core idea of assignment
// and reassignment.
export function VariableBox({ config, onComplete }: Props) {
  const { name, values, caption } = variableBoxConfigSchema.parse(config)
  const [stored, setStored] = useState(0) // how many values stored so far
  const done = stored >= values.length

  useEffect(() => {
    if (done) onComplete?.()
  }, [done, onComplete])

  const current = stored === 0 ? null : values[stored - 1]
  const isString = typeof current === 'string'

  return (
    <div className="widget widget-variable-box" data-widget="variable_box">
      <div className="vb-statement" aria-live="polite">
        {stored === 0 ? (
          <code>{name} = ?</code>
        ) : (
          <code>
            {name} = {isString ? `"${current}"` : current}
          </code>
        )}
      </div>

      <div className="vb-box" aria-label={`box ${name}`}>
        <span className="vb-name">{name}</span>
        <span className="vb-value">{current === null ? 'empty' : isString ? `"${current}"` : current}</span>
      </div>

      <div className="vb-controls">
        <button type="button" onClick={() => setStored((n) => Math.min(n + 1, values.length))} disabled={done}>
          {stored === 0 ? 'Store a value' : 'Store the next value'}
        </button>
        <button type="button" className="ghost" onClick={() => setStored(0)} disabled={stored === 0}>
          Reset
        </button>
        <span className="vb-progress">
          {stored} / {values.length}
        </span>
      </div>

      {caption && <p className="widget-caption">{caption}</p>}
      {done && (
        <p role="status" className="feedback feedback-correct">
          The box only ever holds the most recent value — that is what <code>=</code> does.
        </p>
      )}
    </div>
  )
}
