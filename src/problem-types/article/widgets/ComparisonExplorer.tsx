import { useEffect, useState } from 'react'
import { comparisonExplorerConfigSchema } from '../schema'

interface Props {
  config: unknown
  onComplete?: () => void
}

const OPS = ['==', '!=', '<', '>', '<=', '>='] as const
type Op = (typeof OPS)[number]

function evaluate(a: number, op: Op, b: number): boolean {
  switch (op) {
    case '==':
      return a === b
    case '!=':
      return a !== b
    case '<':
      return a < b
    case '>':
      return a > b
    case '<=':
      return a <= b
    case '>=':
      return a >= b
  }
}

// Pick two numbers and an operator; see the True/False result. A comparison is
// an expression whose value is a boolean — which is exactly what an `if` checks.
export function ComparisonExplorer({ config, onComplete }: Props) {
  const { left, right, caption } = comparisonExplorerConfigSchema.parse(config)
  const [a, setA] = useState(left)
  const [op, setOp] = useState<Op>('==')
  const [b, setB] = useState(right)
  // Encourage the learner to produce both a True and a False before completing.
  // Seed with the initially-displayed outcome so only the other one is needed.
  const [seen, setSeen] = useState<Set<'true' | 'false'>>(
    () => new Set<'true' | 'false'>([evaluate(left, '==', right) ? 'true' : 'false']),
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
  function changeA(v: string) {
    const na = Number(v) || 0
    setA(na)
    record(evaluate(na, op, b))
  }
  function changeOp(v: Op) {
    setOp(v)
    record(evaluate(a, v, b))
  }
  function changeB(v: string) {
    const nb = Number(v) || 0
    setB(nb)
    record(evaluate(a, op, nb))
  }

  useEffect(() => {
    if (done) onComplete?.()
  }, [done, onComplete])

  return (
    <div className="widget widget-comparison-explorer" data-widget="comparison_explorer">
      <div className="ce-row">
        <input
          className="ce-num"
          type="text"
          inputMode="numeric"
          aria-label="left number"
          value={String(a)}
          size={3}
          onChange={(e) => changeA(e.target.value)}
        />
        <select aria-label="operator" value={op} onChange={(e) => changeOp(e.target.value as Op)}>
          {OPS.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
        <input
          className="ce-num"
          type="text"
          inputMode="numeric"
          aria-label="right number"
          value={String(b)}
          size={3}
          onChange={(e) => changeB(e.target.value)}
        />
      </div>

      <div className="ce-result" aria-live="polite">
        <code>
          {a} {op} {b}
        </code>{' '}
        is <strong className={result ? 'is-true' : 'is-false'}>{result ? 'True' : 'False'}</strong>
      </div>

      {caption && <p className="widget-caption">{caption}</p>}
      <p className="ce-hint muted">Try to make it say both True and False.</p>
      {done && (
        <p role="status" className="feedback feedback-correct">
          A comparison always answers True or False — a value an <code>if</code> can use.
        </p>
      )}
    </div>
  )
}
