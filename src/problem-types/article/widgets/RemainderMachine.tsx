import { useEffect, useState } from 'react'
import { remainderMachineConfigSchema } from '../schema'
import { WidgetFrame } from './WidgetFrame'
import { useReducedMotion } from '../../../lib/ui/motion'

interface Props {
  config: unknown
  onComplete?: () => void
}

// Steps a counter from 1..max and shows n % divisor, highlighting when the
// remainder is 0 (n is a multiple). This is the intuition behind using `%` to
// test divisibility in FizzBuzz.
export function RemainderMachine({ config, onComplete }: Props) {
  const { divisor, max, caption } = remainderMachineConfigSchema.parse(config)
  const reduced = useReducedMotion()
  const [n, setN] = useState(1)
  const done = n >= max
  const status = done ? 'done' : n > 1 ? 'running' : 'idle'

  useEffect(() => {
    if (done) onComplete?.()
  }, [done, onComplete])

  const remainder = n % divisor
  const isMultiple = remainder === 0

  return (
    <WidgetFrame
      kind="remainder_machine"
      icon="➗"
      title="Remainder Machine"
      status={status}
      reduced={reduced}
      className="widget-remainder-machine"
      caption={caption}
    >
      <div className={`rm-readout${isMultiple ? ' is-multiple' : ''}`} aria-live="polite">
        <code>
          {n} % {divisor} = {remainder}
        </code>
        {isMultiple && <span className="rm-flag"> ← multiple of {divisor}!</span>}
      </div>

      <div className="rm-controls">
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
        <span className="rm-progress">
          {n} / {max}
        </span>
      </div>

      {done && (
        <p role="status" className="feedback feedback-correct">
          When <code>n % {divisor}</code> is <code>0</code>, n divides evenly by {divisor}.
        </p>
      )}
    </WidgetFrame>
  )
}
