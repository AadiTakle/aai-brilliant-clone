import { useEffect, useState } from 'react'
import { functionMachineConfigSchema } from '../schema'

interface Props {
  config: unknown
  onComplete?: () => void
}

// A function shown as a machine: an input goes in the top, the function runs,
// and an output drops out the bottom. Builds the idea that a function is a box
// that turns inputs into outputs (e.g. print turns text into shown text).
export function FunctionMachine({ config, onComplete }: Props) {
  const { fnName, cases, caption } = functionMachineConfigSchema.parse(config)
  const [index, setIndex] = useState(0)
  const [ran, setRan] = useState(false)
  const done = ran && index >= cases.length - 1

  useEffect(() => {
    if (done) onComplete?.()
  }, [done, onComplete])

  const current = cases[index]

  function run() {
    setRan(true)
  }
  function next() {
    setRan(false)
    setIndex((i) => Math.min(i + 1, cases.length - 1))
  }

  return (
    <div className="widget widget-function-machine" data-widget="function_machine">
      <div className="fm-input" aria-label="input">
        in: <code>{current.input}</code>
      </div>
      <div className={`fm-box${ran ? ' is-running' : ''}`}>
        <code>{fnName}( )</code>
      </div>
      <div className="fm-output" aria-live="polite" aria-label="output">
        out: <strong>{ran ? current.output : '…'}</strong>
      </div>

      <div className="fm-controls">
        {!ran ? (
          <button type="button" onClick={run}>
            Run {fnName}
          </button>
        ) : index < cases.length - 1 ? (
          <button type="button" onClick={next}>
            Try another input
          </button>
        ) : null}
        <span className="fm-progress">
          {index + 1} / {cases.length}
        </span>
      </div>

      {caption && <p className="widget-caption">{caption}</p>}
      {done && (
        <p role="status" className="feedback feedback-correct">
          A function takes an input, does its job, and gives back an output.
        </p>
      )}
    </div>
  )
}
