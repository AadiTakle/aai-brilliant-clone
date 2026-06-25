import { useEffect, useRef, useState } from 'react'
import { functionMachineConfigSchema } from '../schema'
import { WidgetFrame } from './WidgetFrame'
import { useReducedMotion } from '../../../lib/ui/motion'

interface Props {
  config: unknown
  onComplete?: () => void
}

// Pace of the echo typewriter.
const TYPE_START_DELAY_MS = 850
const TYPE_CHAR_MS = 60

// An assembly-line view of a function: the input rides the conveyor belt INTO
// the machine, the machine runs, and the output drops out the OTHER side onto a
// little console. Builds the idea that a function turns inputs into outputs.
//
// Two modes:
//   - preset (default): cycles through authored input→output `cases` (used by L8).
//   - editable + echoInput (opt-in, L1): the learner types text into the input
//     field; on Run that text slides into the machine and is typed out, character
//     by character, into the (initially empty) console — `print` echoing its input.
//
// Respects prefers-reduced-motion: instant reveal, no slide or per-character delay.
export function FunctionMachine({ config, onComplete }: Props) {
  const { fnName, cases, caption, editable, echoInput } = functionMachineConfigSchema.parse(config)
  const [index, setIndex] = useState(0)
  const [ran, setRan] = useState(false)
  const reduced = useReducedMotion()
  const [inputText, setInputText] = useState(cases[0]?.input ?? '')
  const [typed, setTyped] = useState('')
  // Whether the console is mid-print; drives the blinking caret (hidden once done).
  const [typing, setTyping] = useState(false)
  // Lifecycle of the editable Input block:
  //   ready       — visible & editable (initial, and after a reappear/edit)
  //   consuming   — sliding into the machine on Run
  //   reappearing — sliding back in from the right once the line has printed
  const [phase, setPhase] = useState<'ready' | 'consuming' | 'reappearing'>('ready')
  // When non-null (editable/echo only), the machine label shows the EXACT Python
  // call for the entered text, e.g. print("Hello!"). Null = neutral print( ).
  const [syntaxText, setSyntaxText] = useState<string | null>(null)
  // Each Run bumps this so the typewriter effect re-fires even when the text is
  // unchanged. Latest input text is read from a ref to avoid retyping on edit.
  const [runId, setRunId] = useState(0)
  const inputTextRef = useRef(inputText)
  useEffect(() => {
    inputTextRef.current = inputText
  }, [inputText])

  const current = cases[index]
  const done = editable ? ran : ran && index >= cases.length - 1

  useEffect(() => {
    if (done) onComplete?.()
  }, [done, onComplete])

  // Echo typewriter: after the input slides in, type the learner's text out one
  // character at a time, then bring the Input block back. Only runs for the
  // animated (full-motion) case; instant cases are handled in the event handlers
  // to keep the effect free of synchronous setState. Updates happen in timer
  // callbacks. Keyed on runId so a repeat Run with the same text still replays.
  useEffect(() => {
    if (!echoInput || reduced || runId === 0) return
    const full = inputTextRef.current
    let i = 0
    let intervalId: ReturnType<typeof setInterval> | undefined
    const startId = setTimeout(() => {
      intervalId = setInterval(() => {
        i += 1
        setTyped(full.slice(0, i))
        if (i >= full.length && intervalId) {
          clearInterval(intervalId)
          setTyping(false)
          setPhase('reappearing')
          // Block reappears for a new entry → return the label to neutral.
          setSyntaxText(null)
        }
      }, TYPE_CHAR_MS)
    }, TYPE_START_DELAY_MS)
    return () => {
      clearTimeout(startId)
      if (intervalId) clearInterval(intervalId)
    }
  }, [runId, echoInput, reduced])

  function run() {
    setRan(true)
    if (echoInput) {
      // The machine morphs to the exact call for the entered text as it's fed in.
      setSyntaxText(inputText)
      if (reduced) {
        // Instant fill, no caret; the block stays put (effectively reappears
        // instantly) and remains editable.
        setTyped(inputText)
        setTyping(false)
        setPhase('ready')
      } else {
        // Console starts empty, the Input block is consumed, and the caret
        // blinks until the line finishes printing.
        setTyped('')
        setTyping(true)
        setPhase('consuming')
        setRunId((n) => n + 1)
      }
    }
  }
  function next() {
    setRan(false)
    setIndex((i) => Math.min(i + 1, cases.length - 1))
  }
  function changeInput(value: string) {
    setInputText(value)
    setRan(false)
    setTyped('')
    setTyping(false)
    setPhase('ready')
    // New entry → neutral label until the next run.
    setSyntaxText(null)
  }

  const status = done ? 'done' : ran ? 'running' : 'idle'

  return (
    <WidgetFrame
      kind="function_machine"
      icon="⚙️"
      title="Function Machine"
      status={status}
      reduced={reduced}
      className="widget-function-machine"
      caption={caption}
      dataAttrs={{ 'data-running': ran ? 'true' : 'false' }}
    >
      <div className="fm-line">
        <div className="fm-input" aria-label="input">
          {editable ? (
            <div className="fm-edit-block" data-phase={phase}>
              <span className="fm-edit-label">Input:</span>
              <input
                className="fm-input-field"
                type="text"
                aria-label="input text"
                value={inputText}
                onChange={(e) => changeInput(e.target.value)}
              />
            </div>
          ) : (
            <span className="fm-chip">
              in: <code>{current.input}</code>
            </span>
          )}
        </div>

        <div className={`fm-machine fm-box${ran ? ' is-running' : ''}`} data-machine>
          <span className="fm-machine-funnel" aria-hidden="true" />
          <span className="fm-machine-label">
            <code>{syntaxText !== null ? `${fnName}("${syntaxText}")` : `${fnName}( )`}</code>
          </span>
          <span className="fm-machine-gears" aria-hidden="true">
            <span className="fm-gear" />
            <span className="fm-gear" />
          </span>
        </div>

        {echoInput ? (
          <div className="fm-output console is-echo" aria-live="polite" aria-label="output">
            <span className="fm-console-text">{typed}</span>
            {typing && <span className="fm-caret" aria-hidden="true" />}
          </div>
        ) : (
          <div className="fm-output console" aria-live="polite" aria-label="output">
            <span className="fm-chip">
              out: <strong>{ran ? current.output : '…'}</strong>
            </span>
          </div>
        )}
      </div>

      <div className="fm-controls">
        {editable ? (
          <button type="button" className="btn-machine" onClick={run}>
            Run {fnName}
          </button>
        ) : !ran ? (
          <button type="button" className="btn-machine" onClick={run}>
            Run {fnName}
          </button>
        ) : index < cases.length - 1 ? (
          <button type="button" className="btn-machine" onClick={next}>
            Try another input
          </button>
        ) : null}
        {!editable && (
          <span className="fm-progress">
            {index + 1} / {cases.length}
          </span>
        )}
      </div>

      {done && (
        <p role="status" className="feedback feedback-correct">
          A function takes an input, does its job, and gives back an output.
        </p>
      )}
    </WidgetFrame>
  )
}
