import { useEffect, useState } from 'react'
import { codeTracerConfigSchema } from '../schema'
import { WidgetFrame } from './WidgetFrame'
import { useReducedMotion } from '../../../lib/ui/motion'

interface Props {
  config: unknown
  onComplete?: () => void
}

// Steps through an authored execution trace: highlights the current line, shows
// the current variable values, and the output produced so far. The trace is
// pre-computed in the lesson (no interpreter needed), so it stays exact.
export function CodeTracer({ config, onComplete }: Props) {
  const { code, steps, caption } = codeTracerConfigSchema.parse(config)
  const reduced = useReducedMotion()
  const [step, setStep] = useState(0)
  const done = step >= steps.length - 1
  const status = done ? 'done' : step > 0 ? 'running' : 'idle'

  useEffect(() => {
    if (done) onComplete?.()
  }, [done, onComplete])

  const current = steps[step]
  const vars = Object.entries(current.vars)
  const output = steps
    .slice(0, step + 1)
    .map((s) => s.output)
    .filter((o): o is string => o !== undefined && o !== '')

  return (
    <WidgetFrame
      kind="code_tracer"
      icon="🔎"
      title="Code Tracer"
      status={status}
      reduced={reduced}
      className="widget-code-tracer"
      caption={caption}
    >
      <pre className="ct-code">
        {code.map((line, i) => (
          <div key={i} className={`ct-line${i === current.line ? ' is-current' : ''}`}>
            <span className="ct-gutter">{i + 1}</span>
            <code>{line || ' '}</code>
          </div>
        ))}
      </pre>

      <div className="ct-panels">
        <div className="ct-vars" aria-label="variables">
          <p className="ct-panel-label">Variables</p>
          {vars.length === 0 ? (
            <p className="muted">none yet</p>
          ) : (
            <ul>
              {vars.map(([name, value]) => (
                <li key={name}>
                  <code>
                    {name} = {typeof value === 'string' ? `"${value}"` : value}
                  </code>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="ct-output" aria-label="output">
          <p className="ct-panel-label">Output</p>
          <pre className="console">{output.length ? output.join('\n') : '(no output yet)'}</pre>
        </div>
      </div>

      <div className="ct-controls">
        <button
          type="button"
          className="btn-machine"
          onClick={() => setStep((s) => Math.min(s + 1, steps.length - 1))}
          disabled={done}
        >
          Step
        </button>
        <button type="button" className="btn-ghost" onClick={() => setStep(0)} disabled={step === 0}>
          Restart
        </button>
        <span className="ct-progress">
          step {step + 1} / {steps.length}
        </span>
      </div>

      {done && (
        <p role="status" className="feedback feedback-correct">
          You traced the whole program — following the values is how you read code.
        </p>
      )}
    </WidgetFrame>
  )
}
