import { useEffect, useState } from 'react'
import { decisionMachineConfigSchema } from '../schema'
import { NumberWheel } from './NumberWheel'

interface Props {
  config: unknown
  onComplete?: () => void
}

// Does the user prefer reduced motion? Guarded so it works in non-browser tests.
function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n))
}

// The LEARNER-DRIVEN decision machine. The learner scrolls a number dial (the
// shared NumberWheel) to choose the input; the widget checks the conditions
// top-to-bottom and lights the FIRST matching branch (or the else), showing what
// the program prints — all live as the dial moves. It completes once the learner
// has made at least two DIFFERENT outcomes light up (e.g. a branch firing and a
// miss), so they have actually watched control flow route differently.
export function DecisionMachine({ config, onComplete }: Props) {
  const { variable, conditions, hasElse, elseLabel, max, initial, caption } =
    decisionMachineConfigSchema.parse(config)
  const [reduced] = useState(prefersReducedMotion)
  const [n, setN] = useState(() => clamp(initial, 0, max))

  // The first condition whose divisor divides n; -1 means "no branch matched".
  function matchIndexFor(value: number): number {
    return conditions.findIndex((c) => value % c.divisor === 0)
  }
  const matchIndex = matchIndexFor(n)
  // -1 keeps "no match" distinct from the branches when tracking explored outcomes.
  const elseActive = hasElse && matchIndex === -1

  // What the program prints for this input: the matched branch's literal, the
  // number itself for the else, or nothing when an if-only program misses.
  let output: string | null
  if (matchIndex >= 0) output = conditions[matchIndex].prints
  else if (hasElse) output = String(n)
  else output = null

  // Track the distinct outcomes (branch indices, with -1 for a miss) the learner
  // has lit up. Two different outcomes is enough to count as real exploration.
  const [seen, setSeen] = useState<Set<number>>(() => new Set([matchIndexFor(clamp(initial, 0, max))]))
  const done = seen.size >= 2

  function changeN(next: number) {
    setN(next)
    setSeen((prev) => {
      const idx = matchIndexFor(next)
      if (prev.has(idx)) return prev
      const out = new Set(prev)
      out.add(idx)
      return out
    })
  }

  useEffect(() => {
    if (done) onComplete?.()
  }, [done, onComplete])

  return (
    <div
      className="widget widget-decision-machine"
      data-widget="decision_machine"
      data-motion={reduced ? 'reduced' : 'full'}
    >
      <div className="dm-stage">
        <div className="dm-dial">
          <NumberWheel max={max} selected={n} onSelect={changeN} reduced={reduced} ariaLabel="input number" />
          <div className="dm-value" aria-live="polite">
            <code>
              {variable} = {n}
            </code>
          </div>
        </div>

        <ul className="dm-branches" aria-label="program">
          {conditions.map((c, i) => {
            const keyword = i === 0 ? 'if' : 'elif'
            const active = i === matchIndex
            return (
              <li key={i} className={`dm-branch${active ? ' is-active' : ''}`}>
                <code>
                  {keyword} {variable} % {c.divisor} == 0:
                </code>{' '}
                <span className="dm-label">{c.label}</span>
              </li>
            )
          })}
          {hasElse && (
            <li className={`dm-branch${elseActive ? ' is-active' : ''}`}>
              <code>else:</code> <span className="dm-label">{elseLabel}</span>
            </li>
          )}
        </ul>
      </div>

      <div className="dm-output" aria-live="polite">
        <span className="dm-output-label">prints</span>
        <pre className="console" aria-label="output">
          {output ?? '(nothing)'}
        </pre>
      </div>

      {caption && <p className="widget-caption">{caption}</p>}
      <p className="dm-hint muted">Scroll the dial to change the input. Watch which line lights up — and what prints.</p>
      {done && (
        <p role="status" className="feedback feedback-correct">
          Python checks the lines from the top and runs the first one whose question is True.
        </p>
      )}
    </div>
  )
}
