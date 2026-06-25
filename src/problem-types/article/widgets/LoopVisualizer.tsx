import { useEffect, useState } from 'react'
import { loopVisualizerConfigSchema } from '../schema'
import { WidgetFrame } from './WidgetFrame'
import { useReducedMotion } from '../../../lib/ui/motion'

interface LoopVisualizerProps {
  config: unknown
  onComplete?: () => void
}

// Steps through a `for i in range(n)` loop one iteration at a time, showing the
// counter and the output produced on each pass.
export function LoopVisualizer({ config, onComplete }: LoopVisualizerProps) {
  const { iterations, action, caption } = loopVisualizerConfigSchema.parse(config)
  const reduced = useReducedMotion()
  const [current, setCurrent] = useState(0)
  const done = current >= iterations
  const status = done ? 'done' : current > 0 ? 'running' : 'idle'

  useEffect(() => {
    if (done) onComplete?.()
  }, [done, onComplete])

  const outputs = Array.from({ length: current }, (_, i) => ({ i, text: action }))

  return (
    <WidgetFrame
      kind="loop_visualizer"
      icon="🔁"
      title="Loop Machine"
      status={status}
      reduced={reduced}
      className="widget-loop-visualizer"
      caption={caption}
    >
      <pre className="lv-code">
        <code>{`for i in range(${iterations}):\n    ${action}`}</code>
      </pre>

      <div className="lv-state">
        <span className="lv-counter" aria-live="polite">
          i = {current > 0 ? current - 1 : 0}
        </span>
        <span className="lv-progress">
          iteration {current} / {iterations}
        </span>
      </div>

      <ol className="lv-output" aria-label="loop output">
        {outputs.map((o) => (
          <li key={o.i}>{o.text}</li>
        ))}
      </ol>

      <div className="lv-controls">
        <button
          type="button"
          className="btn-machine"
          onClick={() => setCurrent((c) => Math.min(c + 1, iterations))}
          disabled={done}
        >
          Step
        </button>
        <button
          type="button"
          className="btn-ghost"
          onClick={() => setCurrent(0)}
          disabled={current === 0}
        >
          Reset
        </button>
      </div>

      {done && (
        <p role="status" className="feedback feedback-correct">
          The loop body ran {iterations} times — once for each value of <code>i</code>.
        </p>
      )}
    </WidgetFrame>
  )
}
