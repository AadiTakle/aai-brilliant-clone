import { useEffect, useState } from 'react'
import { branchVisualizerConfigSchema } from '../schema'
import { WidgetFrame } from './WidgetFrame'
import { useReducedMotion } from '../../../lib/ui/motion'

interface Props {
  config: unknown
  onComplete?: () => void
}

// Steps a value 1..max and shows which if / elif / else branch runs: the first
// condition whose divisor divides the value, otherwise the else branch. Makes
// the "only the first matching branch runs" rule concrete.
export function BranchVisualizer({ config, onComplete }: Props) {
  const { conditions, elseLabel, max, caption } = branchVisualizerConfigSchema.parse(config)
  const reduced = useReducedMotion()
  const [n, setN] = useState(1)
  const done = n >= max
  const status = done ? 'done' : n > 1 ? 'running' : 'idle'

  useEffect(() => {
    if (done) onComplete?.()
  }, [done, onComplete])

  const matchIndex = conditions.findIndex((c) => n % c.divisor === 0)

  return (
    <WidgetFrame
      kind="branch_visualizer"
      icon="🔀"
      title="Branch Machine"
      status={status}
      reduced={reduced}
      className="widget-branch-visualizer"
      caption={caption}
    >
      <div className="bv-value" aria-live="polite">
        n = <strong>{n}</strong>
      </div>

      <ul className="bv-branches">
        {conditions.map((c, i) => {
          const keyword = i === 0 ? 'if' : 'elif'
          const active = i === matchIndex
          return (
            <li key={i} className={`bv-branch${active ? ' is-active' : ''}`}>
              <code>
                {keyword} n % {c.divisor} == 0:
              </code>{' '}
              <span className="bv-label">{c.label}</span>
            </li>
          )
        })}
        <li className={`bv-branch${matchIndex === -1 ? ' is-active' : ''}`}>
          <code>else:</code> <span className="bv-label">{elseLabel}</span>
        </li>
      </ul>

      <div className="bv-controls">
        <button
          type="button"
          className="btn-machine"
          onClick={() => setN((v) => Math.min(v + 1, max))}
          disabled={done}
        >
          Next number
        </button>
        <button type="button" className="btn-ghost" onClick={() => setN(1)} disabled={n === 1}>
          Reset
        </button>
        <span className="bv-progress">
          {n} / {max}
        </span>
      </div>

      {done && (
        <p role="status" className="feedback feedback-correct">
          Python checks the branches top to bottom and runs the first one that matches.
        </p>
      )}
    </WidgetFrame>
  )
}
