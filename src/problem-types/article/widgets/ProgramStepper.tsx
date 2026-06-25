import { useEffect, useMemo, useState } from 'react'
import {
  programStepperConfigSchema,
  type ProgramStepperConfig,
  type ProgramStepperDecisionConfig,
  type ProgramStepperLoopConfig,
} from '../schema'

interface Props {
  config: unknown
  onComplete?: () => void
}

// Does the user prefer reduced motion? When true we skip the line-highlight
// transition so nothing slides/fades. Guarded so it works in non-browser tests.
function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

interface ExecStep {
  // Index into the displayed `code` lines that this step highlights.
  line: number
  commentary: string
  // The text printed on this step, if any (only the body lines print).
  output?: string
  // The visible program variables at this step (loop mode shows `i` etc.).
  vars?: Record<string, string | number>
}

// --- Decision mode (L5): if/elif/else "decision machine" --------------------

// Build the READ-ONLY program lines from the config. Header + body for each
// condition, then the else header + body. The body of a condition prints its
// literal; the else prints the variable itself.
function buildDecisionCode(cfg: ProgramStepperDecisionConfig): string[] {
  const lines: string[] = []
  cfg.conditions.forEach((c, i) => {
    const keyword = i === 0 ? 'if' : 'elif'
    lines.push(`${keyword} ${cfg.variable} % ${c.divisor} == 0:`)
    lines.push(`    print(${JSON.stringify(c.prints)})`)
  })
  lines.push('else:')
  lines.push(`    print(${cfg.variable})`)
  return lines
}

// Trace what Python does for one entered number: check each branch top to
// bottom, stop at the first True one (running its body), else fall through.
function buildDecisionExec(cfg: ProgramStepperDecisionConfig, value: number): ExecStep[] {
  const steps: ExecStep[] = []
  for (let i = 0; i < cfg.conditions.length; i++) {
    const c = cfg.conditions[i]
    const keyword = i === 0 ? 'if' : 'elif'
    const rem = ((value % c.divisor) + c.divisor) % c.divisor
    const matched = rem === 0
    steps.push({
      line: i * 2,
      commentary: matched
        ? `Check the ${keyword}: ${cfg.variable} % ${c.divisor} is ${rem}. Is that equal to 0? That's True, so Python takes this branch.`
        : `Check the ${keyword}: ${cfg.variable} % ${c.divisor} is ${rem}. Is that equal to 0? That's False, so Python skips this branch and keeps looking.`,
    })
    if (matched) {
      steps.push({
        line: i * 2 + 1,
        commentary: `The check was True, so this line runs and prints ${JSON.stringify(c.prints)}. Every branch below is skipped.`,
        output: c.prints,
      })
      return steps
    }
  }
  const elseHeader = cfg.conditions.length * 2
  steps.push({
    line: elseHeader,
    commentary: `None of the checks above were True, so Python falls through to the else — its backup plan.`,
  })
  steps.push({
    line: elseHeader + 1,
    commentary: `The else runs and prints ${cfg.elseLabel}, which here is ${value}.`,
    output: String(value),
  })
  return steps
}

// --- Loop mode (L6): a `for i in range(...)` walk-through -------------------

function rangeText(cfg: ProgramStepperLoopConfig): string {
  return cfg.start === 0 ? `range(${cfg.stop})` : `range(${cfg.start}, ${cfg.stop})`
}

function buildLoopCode(cfg: ProgramStepperLoopConfig): string[] {
  const lines: string[] = []
  if (cfg.accumulator) lines.push(`${cfg.accumulator.name} = ${cfg.accumulator.init}`)
  lines.push(`for ${cfg.loopVar} in ${rangeText(cfg)}:`)
  if (cfg.accumulator) {
    lines.push(`    ${cfg.accumulator.name} = ${cfg.accumulator.name} + ${cfg.accumulator.step}`)
    lines.push(`    print(${cfg.accumulator.name})`)
  } else {
    lines.push(`    print(${cfg.loopVar})`)
  }
  return lines
}

// Step the loop one iteration at a time. Each iteration walks the header (i gets
// its next value), then the body line(s). The vars readout shows i (and the
// running total, if any) so the learner can watch them change.
function buildLoopExec(cfg: ProgramStepperLoopConfig): ExecStep[] {
  const acc = cfg.accumulator
  const headerLine = acc ? 1 : 0
  const steps: ExecStep[] = []
  let accVal = acc?.init ?? 0

  const varsAt = (i: number): Record<string, string | number> =>
    acc ? { [cfg.loopVar]: i, [acc.name]: accVal } : { [cfg.loopVar]: i }

  for (let i = cfg.start; i < cfg.stop; i++) {
    steps.push({
      line: headerLine,
      vars: varsAt(i),
      commentary:
        i === cfg.start
          ? `The loop begins: ${rangeText(cfg)} hands ${cfg.loopVar} its first value, ${i}.`
          : `Back to the top of the loop: ${cfg.loopVar} takes its next value, ${i}.`,
    })
    if (acc) {
      const prev = accVal
      accVal = prev + acc.step
      steps.push({
        line: headerLine + 1,
        vars: varsAt(i),
        commentary: `Run the body: add ${acc.step} to ${acc.name} → ${prev} + ${acc.step} = ${accVal}.`,
      })
      steps.push({
        line: headerLine + 2,
        vars: varsAt(i),
        output: String(accVal),
        commentary: `Print ${acc.name}. The console shows ${accVal}.`,
      })
    } else {
      steps.push({
        line: headerLine + 1,
        vars: varsAt(i),
        output: String(i),
        commentary: `Run the body: print ${cfg.loopVar}. The console shows ${i}.`,
      })
    }
  }

  const turns = Math.max(0, cfg.stop - cfg.start)
  steps.push({
    line: headerLine,
    vars: varsAt(cfg.stop - 1),
    commentary: acc
      ? `${rangeText(cfg)} is used up after ${turns} turns, so the loop ends. The same step repeated ${turns} times got us to ${accVal} — the loop did the tedious part for you.`
      : `${rangeText(cfg)} is used up after ${turns} turns, so the loop ends. The body ran ${turns} times without you repeating yourself.`,
  })
  return steps
}

// The program stepper. A read-only program sits on the left; the learner STEPS
// line by line (there is deliberately no "run it all" button). Decision mode
// reads a number from a side input and shows which branch wins; loop mode walks
// a `for` loop, showing the loop variable and a growing console. Each step
// highlights the current line and explains what it does.
export function ProgramStepper({ config, onComplete }: Props) {
  const cfg: ProgramStepperConfig = useMemo(() => programStepperConfigSchema.parse(config), [config])
  const [reduced] = useState(prefersReducedMotion)
  const isLoop = cfg.mode === 'loop'
  const isTrace = cfg.mode === 'trace'
  const isDecision = cfg.mode === 'decision'
  // Loop and trace modes show a variables readout on the side and have no input.
  const showVars = isLoop || isTrace
  const loopVar = cfg.mode === 'loop' ? cfg.loopVar : 'i'

  const code = useMemo(() => {
    if (cfg.mode === 'loop') return buildLoopCode(cfg)
    if (cfg.mode === 'trace') return cfg.code
    return buildDecisionCode(cfg)
  }, [cfg])

  // Decision mode reads a number; loop and trace modes have no input.
  const [raw, setRaw] = useState(() => (cfg.mode === 'decision' ? String(cfg.defaultInput) : ''))
  const value = Number.parseInt(raw, 10)
  const valid = isDecision ? raw.trim() !== '' && Number.isFinite(value) : true

  const exec = useMemo<ExecStep[]>(() => {
    if (cfg.mode === 'loop') return buildLoopExec(cfg)
    if (cfg.mode === 'trace') return cfg.steps
    return valid ? buildDecisionExec(cfg, value) : []
  }, [cfg, valid, value])

  const [stepIndex, setStepIndex] = useState(0)

  // A fresh number is a fresh run: start stepping from the top again.
  function changeInput(next: string) {
    setRaw(next)
    setStepIndex(0)
  }

  const atEnd = exec.length > 0 && stepIndex >= exec.length - 1
  const started = exec.length > 0

  // Completing one full step-through (reaching the printed result) is enough.
  useEffect(() => {
    if (atEnd) onComplete?.()
  }, [atEnd, onComplete])

  const current = started ? exec[Math.min(stepIndex, exec.length - 1)] : null

  // The console shows every line printed up to (and including) the current step,
  // so a loop builds up a real multi-line console. (Decision mode prints at most
  // one line, so this collapses to that single line.)
  const shown = exec.slice(0, stepIndex + 1)
  const printed = shown.map((s) => s.output).filter((o): o is string => o !== undefined)
  const output = printed.length ? printed.join('\n') : undefined

  return (
    <div
      className="widget widget-program-stepper"
      data-widget="program_stepper"
      data-mode={cfg.mode}
      data-motion={reduced ? 'reduced' : 'full'}
    >
      <div className="ps-stage">
        <pre className="ps-code" aria-label="program">
          {code.map((line, i) => (
            <div key={i} className={`ps-line${current && i === current.line ? ' is-current' : ''}`}>
              <span className="ps-gutter">{i + 1}</span>
              <code>{line || ' '}</code>
            </div>
          ))}
        </pre>

        <div className="ps-side">
          {showVars ? (
            <>
              <div className="ps-vars" aria-label="variables">
                {Object.entries(current?.vars ?? {}).map(([k, v]) => (
                  <div key={k} className="ps-var">
                    <code>
                      {k} = {String(v)}
                    </code>
                  </div>
                ))}
              </div>
              <p className="ps-input-note muted">
                {isLoop
                  ? `No input to type — just step. Watch ${loopVar} and the console change each step.`
                  : 'No input to type — just step. Watch the variables and the console change each step.'}
              </p>
            </>
          ) : (
            <>
              <label className="ps-input-label">
                input number
                <input
                  type="number"
                  className="ps-input"
                  aria-label="input number"
                  value={raw}
                  onChange={(e) => changeInput(e.target.value)}
                />
              </label>
              <p className="ps-input-note muted">
                This is the number the program reads. Type any whole number, then step through.
              </p>
            </>
          )}
        </div>
      </div>

      <div className="ps-readout">
        <p className="ps-commentary" aria-label="commentary" aria-live="polite">
          {valid ? current?.commentary : 'Type a whole number into the input field to begin.'}
        </p>
        <div className="ps-output" aria-label="output">
          <span className="ps-output-label">prints</span>
          <pre className="console">{output ?? '(nothing yet)'}</pre>
        </div>
      </div>

      <div className="ps-controls">
        <button
          type="button"
          onClick={() => setStepIndex((s) => Math.min(s + 1, exec.length - 1))}
          disabled={!valid || atEnd}
        >
          Step
        </button>
        <button
          type="button"
          className="ghost"
          onClick={() => setStepIndex(0)}
          disabled={!valid || stepIndex === 0}
        >
          Restart
        </button>
        {valid && (
          <span className="ps-progress">
            step {Math.min(stepIndex + 1, exec.length)} / {exec.length}
          </span>
        )}
      </div>

      {cfg.caption && <p className="widget-caption">{cfg.caption}</p>}
      {atEnd && (
        <p role="status" className="feedback feedback-correct">
          {isLoop
            ? "You stepped through the whole loop — that's a loop repeating the work for you. The for-line's exact spelling is coming up next."
            : isTrace
              ? "You stepped through the whole program — that's the accumulator building the answer up one piece at a time."
              : 'You stepped the whole program. Try a different number and step again to see another branch win.'}
        </p>
      )}
    </div>
  )
}
