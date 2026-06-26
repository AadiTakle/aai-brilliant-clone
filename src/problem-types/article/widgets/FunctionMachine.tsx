import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { functionMachineConfigSchema } from '../schema'
import { WidgetFrame } from './WidgetFrame'
import { useReducedMotion } from '../../../lib/ui/motion'
import { runPython } from '../../../lib/pyodide/runner'
import { buildFunctionMachineSource } from './functionMachineSource'

interface Props {
  config: unknown
  onComplete?: () => void
}

// Phase of the step-through machine:
//   0  armed   — value sits in the Input bay (quoted, editable); machine empty.
//   1  fed     — the quoted token has ridden into fnName(  ) -> fnName("Hi");
//                the field is now read-only.
//   2  emitted — the value drops into the console as bare text (no quotes); done.
type Phase = 0 | 1 | 2

// A generic three-bay "machine": the learner types a value, then STEPS it
// through the machine. A single token element rides from the Input bay into the
// machine's parentheses, then out to the Console.
//
// Two modes:
//   • ECHO (default, no `code`): the output mirrors the input (quotes dropped).
//     Used by `print` (L1) and the named machine (L8) to teach the input →
//     function → output shape.
//   • RUN (config.code present): the widget actually executes the author's
//     Python (which defines `fnName`), feeds the learner's input through
//     `fnName(input)`, and shows the REAL output. This lets a named machine
//     (e.g. a memoized fib) behave like what it claims to be, with the author's
//     own messaging.
//
// Motion: one shared-layout token (`layoutId="fm-token"`) animates between the
// three bay slots via FLIP. The app is wrapped in <MotionConfig reducedMotion="user">,
// so under prefers-reduced-motion the token simply snaps between slots.
export function FunctionMachine({ config, onComplete }: Props) {
  const { fnName, cases, caption, quoted, code, feedNote, emitNote, successMessage } =
    functionMachineConfigSchema.parse(config)
  const reduced = useReducedMotion()
  const [value, setValue] = useState(cases[0]?.input ?? '')
  const [phase, setPhase] = useState<Phase>(0)
  // Run-mode state: the real output Python produced (and any error).
  const [running, setRunning] = useState(false)
  const [computedOutput, setComputedOutput] = useState<string | null>(null)
  const [runError, setRunError] = useState<string | null>(null)

  const isRunMode = Boolean(code && code.trim())
  const quote = quoted ? '"' : ''

  useEffect(() => {
    if (phase === 2) onComplete?.()
  }, [phase, onComplete])

  // ECHO mode: advance one phase per press.
  function step() {
    setPhase((p) => (p < 2 ? ((p + 1) as Phase) : p))
  }

  // RUN mode: ride the token in, execute the script, then drop the REAL output.
  async function run() {
    if (running) return
    setRunning(true)
    setRunError(null)
    setComputedOutput(null)
    setPhase(1)
    try {
      const source = buildFunctionMachineSource(fnName, code as string, value, quoted)
      const { stdout, error } = await runPython(source)
      if (error) {
        setRunError(error)
        setComputedOutput('')
      } else {
        setComputedOutput(stdout.trim())
      }
    } catch (e) {
      setRunError(e instanceof Error ? e.message : String(e))
      setComputedOutput('')
    } finally {
      setRunning(false)
      setPhase(2)
    }
  }

  function reset() {
    setPhase(0)
    setComputedOutput(null)
    setRunError(null)
  }

  const status: 'idle' | 'running' | 'done' =
    phase === 2 ? 'done' : phase === 1 ? 'running' : 'idle'

  // What the OUTPUT token shows: the real computed output in run mode, otherwise
  // the input echoed back (quotes dropped).
  const outputValue = isRunMode ? (computedOutput ?? '') : value

  const commentary = isRunMode
    ? phase === 0
      ? `Type a value, then press Run to send it through ${fnName}.`
      : phase === 1
        ? (feedNote ?? `${quote}${value}${quote} rides into ${fnName}( ) — that is the input it works on.`)
        : runError
          ? `${fnName} hit an error before it could finish — see below.`
          : (emitNote ?? `${fnName} did its work and handed back the output below.`)
    : phase === 0
      ? `Type a value, then press Step to feed it into ${fnName}.`
      : phase === 1
        ? (feedNote ??
          `The quoted text ${quote}${value}${quote} rides into ${fnName}( ) — the quotes mark it as text and the parentheses are where ${fnName} takes its input.`)
        : (emitNote ??
          `${fnName} hands back ${value} — the quotes are gone, so the console shows just the value.`)

  // The single travelling token, rendered into whichever bay matches the phase.
  // layoutId keeps it the same element across bays so Motion animates the ride.
  function tokenContent() {
    if (phase === 0) {
      return (
        <motion.span layout layoutId="fm-token" className="fm-token" data-quoted={quoted}>
          {quoted && (
            <span className="fm-quote" aria-hidden="true">
              "
            </span>
          )}
          <input
            className="fm-input-field"
            type="text"
            aria-label="input text"
            value={value}
            spellCheck={false}
            autoComplete="off"
            onChange={(e) => setValue(e.target.value)}
          />
          {quoted && (
            <span className="fm-quote" aria-hidden="true">
              "
            </span>
          )}
        </motion.span>
      )
    }
    if (phase === 1) {
      return (
        <motion.span layout layoutId="fm-token" className="fm-token fm-token-readonly" data-quoted={quoted}>
          {quoted && <span className="fm-quote">"</span>}
          <span className="fm-token-value">{value}</span>
          {quoted && <span className="fm-quote">"</span>}
        </motion.span>
      )
    }
    return (
      <motion.span layout layoutId="fm-token" className="fm-token fm-token-bare">
        <span className="fm-token-value">{outputValue || (isRunMode ? '(no output)' : '')}</span>
      </motion.span>
    )
  }

  return (
    <WidgetFrame
      kind="function_machine"
      icon="⚙️"
      title="Function Machine"
      status={status}
      reduced={reduced}
      className="widget-function-machine"
      caption={caption}
      dataAttrs={{ 'data-running': phase >= 1 ? 'true' : 'false', 'data-phase': String(phase) }}
    >
      <div className="fm-line">
        <div className="fm-bay fm-input" aria-label="input">
          <span className="fm-bay-label">Input</span>
          <div className="fm-slot fm-input-slot">{phase === 0 && tokenContent()}</div>
        </div>

        <span className="fm-conduit" aria-hidden="true" />

        <div className="fm-bay fm-machine fm-box" data-machine data-phase={phase}>
          <span className="fm-machine-label">
            <code>
              {fnName}(<span className="fm-slot fm-machine-slot">{phase === 1 && tokenContent()}</span>)
            </code>
          </span>
          <span className="fm-machine-gears" aria-hidden="true">
            <span className="fm-gear" />
            <span className="fm-gear" />
          </span>
        </div>

        <span className="fm-conduit" aria-hidden="true" />

        <div className="fm-bay fm-output console" aria-live="polite" aria-label="output">
          <span className="fm-bay-label">Output</span>
          <div className="fm-slot fm-console-slot">{phase === 2 && tokenContent()}</div>
        </div>
      </div>

      <div className="fm-controls">
        {isRunMode ? (
          <button type="button" className="btn-machine" onClick={run} disabled={running || phase === 2}>
            {running ? 'Running…' : 'Run'}
          </button>
        ) : (
          <button type="button" className="btn-machine" onClick={step} disabled={phase === 2}>
            Step
          </button>
        )}
        <button type="button" className="btn-ghost" onClick={reset} disabled={phase === 0 || running}>
          Reset
        </button>
        {!isRunMode && (
          <span className="fm-progress" aria-hidden="true">
            step {phase} of 2
          </span>
        )}
      </div>

      {running && (
        <p className="muted" aria-live="polite">
          Loading Python the first time can take a few seconds…
        </p>
      )}

      <p className="fm-commentary" role="status" aria-live="polite">
        {commentary}
      </p>

      {phase === 2 && runError && (
        <p role="alert" className="feedback feedback-incorrect">
          Error: {runError}
        </p>
      )}

      {phase === 2 && !runError && (
        <p role="status" className="feedback feedback-correct">
          {successMessage ?? 'A function takes an input, does its job, and gives back an output.'}
        </p>
      )}
    </WidgetFrame>
  )
}
