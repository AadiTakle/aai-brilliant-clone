import { useEffect, useState } from 'react'
import { comparisonExplorerConfigSchema } from '../schema'
import { NumberWheel } from './NumberWheel'

interface Props {
  config: unknown
  onComplete?: () => void
}

// Only the operators the curriculum has actually taught by L4 — extra
// comparators (!=, <=, >=) would just confuse a true beginner, so they are
// intentionally left out of the selectable list.
const OPS = ['==', '>', '<'] as const
type Op = (typeof OPS)[number]

function evaluate(a: number, op: Op, b: number): boolean {
  switch (op) {
    case '==':
      return a === b
    case '>':
      return a > b
    case '<':
      return a < b
  }
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n))
}

// Does the user prefer reduced motion? Guarded so it works in non-browser tests.
function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

// Pick the two numbers being compared with a pair of iPhone-alarm-style scroll
// dials (the same NumberWheel mechanism the ModuloPicker uses): whichever number
// is centred is the one in the comparison — no clicking required. The True/False
// result updates live as the learner scrolls. A comparison is an expression whose
// value is a boolean — which is exactly what a yes/no question is. Respects
// prefers-reduced-motion.
export function ComparisonExplorer({ config, onComplete }: Props) {
  const { left, right, max, caption } = comparisonExplorerConfigSchema.parse(config)
  const [reduced] = useState(prefersReducedMotion)
  const [a, setA] = useState(() => clamp(left, 0, max))
  const [op, setOp] = useState<Op>('==')
  const [b, setB] = useState(() => clamp(right, 0, max))
  // Encourage the learner to produce both a True and a False before completing.
  // Seed with the initially-displayed outcome so only the other one is needed.
  const [seen, setSeen] = useState<Set<'true' | 'false'>>(
    () => new Set<'true' | 'false'>([evaluate(clamp(left, 0, max), '==', clamp(right, 0, max)) ? 'true' : 'false']),
  )

  const result = evaluate(a, op, b)
  const done = seen.has('true') && seen.has('false')

  // Record outcomes as the learner changes inputs (not in an effect).
  function record(outcome: boolean) {
    setSeen((prev) => {
      const key = outcome ? 'true' : 'false'
      if (prev.has(key)) return prev
      const next = new Set(prev)
      next.add(key)
      return next
    })
  }
  function changeA(n: number) {
    setA(n)
    record(evaluate(n, op, b))
  }
  function changeOp(v: Op) {
    setOp(v)
    record(evaluate(a, v, b))
  }
  function changeB(n: number) {
    setB(n)
    record(evaluate(a, op, n))
  }

  useEffect(() => {
    if (done) onComplete?.()
  }, [done, onComplete])

  return (
    <div
      className="widget widget-comparison-explorer"
      data-widget="comparison_explorer"
      data-motion={reduced ? 'reduced' : 'full'}
    >
      <div className="ce-row ce-wheels">
        <NumberWheel max={max} selected={a} onSelect={changeA} reduced={reduced} ariaLabel="left number" />
        <select aria-label="operator" value={op} onChange={(e) => changeOp(e.target.value as Op)}>
          {OPS.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
        <NumberWheel max={max} selected={b} onSelect={changeB} reduced={reduced} ariaLabel="right number" />
      </div>

      <div className="ce-result" aria-live="polite">
        <code>
          {a} {op} {b}
        </code>{' '}
        is <strong className={result ? 'is-true' : 'is-false'}>{result ? 'True' : 'False'}</strong>
      </div>

      {caption && <p className="widget-caption">{caption}</p>}
      <p className="ce-hint muted">Scroll each dial to change the numbers. Try to make it say both True and False.</p>
      {done && (
        <p role="status" className="feedback feedback-correct">
          A comparison always answers True or False — a yes/no value the computer can act on.
        </p>
      )}
    </div>
  )
}
