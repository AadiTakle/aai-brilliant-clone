import { useMemo, useState } from 'react'
import type { StepRenderProps } from '../types'
import type { ParsonsLine, ParsonsProblemConfig } from './schema'
import { gradeParsons, type ParsonsGradeResult } from '../../lib/grading/parsonsGrader'

interface SolutionLine {
  id: string
  code: string
  indent: number
}

// Deterministic shuffle (mulberry32) so the puzzle starts scrambled but stable
// across renders, and so it is never accidentally pre-solved.
function shuffle<T>(items: T[], seed: number): T[] {
  let s = seed >>> 0
  const rand = () => {
    s += 0x6d2b79f5
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

interface BodyProps {
  title?: string
  config: ParsonsProblemConfig
  onComplete?: () => void
  onGraded?: (result: { correct: boolean }) => void
}

function ParsonsBody({ title, config, onComplete, onGraded }: BodyProps) {
  const allLines = useMemo<ParsonsLine[]>(
    () => [...config.lines, ...config.distractors],
    [config.lines, config.distractors],
  )
  const maxIndent = useMemo(
    () => Math.max(1, ...config.lines.map((l) => l.indent)),
    [config.lines],
  )

  const [bank, setBank] = useState<ParsonsLine[]>(() => shuffle(allLines, allLines.length * 97 + 13))
  const [solution, setSolution] = useState<SolutionLine[]>([])
  const [result, setResult] = useState<ParsonsGradeResult | null>(null)

  const solved = result?.correct ?? false

  function clearResult() {
    setResult(null)
  }

  function addToSolution(id: string) {
    const line = bank.find((l) => l.id === id)
    if (!line) return
    setBank((b) => b.filter((l) => l.id !== id))
    setSolution((s) => [...s, { id: line.id, code: line.code, indent: 0 }])
    clearResult()
  }

  function removeFromSolution(index: number) {
    setSolution((s) => {
      const line = s[index]
      setBank((b) => [...b, { id: line.id, code: line.code, indent: line.indent }])
      return s.filter((_, i) => i !== index)
    })
    clearResult()
  }

  function move(index: number, delta: number) {
    setSolution((s) => {
      const next = index + delta
      if (next < 0 || next >= s.length) return s
      const copy = [...s]
      ;[copy[index], copy[next]] = [copy[next], copy[index]]
      return copy
    })
    clearResult()
  }

  function reindent(index: number, delta: number) {
    setSolution((s) =>
      s.map((line, i) =>
        i === index
          ? { ...line, indent: Math.min(maxIndent, Math.max(0, line.indent + delta)) }
          : line,
      ),
    )
    clearResult()
  }

  function check() {
    const graded = gradeParsons(
      solution.map((l) => ({ id: l.id, indent: l.indent })),
      config.lines.map((l) => ({ id: l.id, indent: l.indent })),
      config.checkIndent,
    )
    setResult(graded)
    onGraded?.({ correct: graded.correct })
    if (graded.correct) onComplete?.()
  }

  return (
    <section className="problem problem-parsons" data-step-type="parsons_problem">
      {title && <h2>{title}</h2>}
      <p className="block-prompt">{config.prompt}</p>

      <div className="parsons-layout">
        <div className="parsons-bank" aria-label="Available lines">
          <p className="parsons-zone-label">Available lines</p>
          {bank.length === 0 && <p className="muted">All lines placed.</p>}
          {bank.map((line) => (
            <div key={line.id} className="parsons-line parsons-line-bank">
              <code>{line.code}</code>
              <button
                type="button"
                className="parsons-add"
                aria-label={`Add ${line.code}`}
                onClick={() => addToSolution(line.id)}
                disabled={solved}
              >
                Add →
              </button>
            </div>
          ))}
        </div>

        <div className="parsons-solution" aria-label="Your program">
          <p className="parsons-zone-label">Your program</p>
          {solution.length === 0 && <p className="muted">Add lines from the left, then order and indent them.</p>}
          <ol className="parsons-list">
            {solution.map((line, i) => (
              <li key={line.id} className="parsons-line parsons-line-solution" style={{ marginLeft: `${line.indent * 1.5}rem` }}>
                <code>{line.code}</code>
                <span className="parsons-controls">
                  <button type="button" aria-label="Outdent" onClick={() => reindent(i, -1)} disabled={solved || line.indent === 0}>
                    ⇤
                  </button>
                  <button type="button" aria-label="Indent" onClick={() => reindent(i, 1)} disabled={solved || line.indent >= maxIndent}>
                    ⇥
                  </button>
                  <button type="button" aria-label="Move up" onClick={() => move(i, -1)} disabled={solved || i === 0}>
                    ↑
                  </button>
                  <button type="button" aria-label="Move down" onClick={() => move(i, 1)} disabled={solved || i === solution.length - 1}>
                    ↓
                  </button>
                  <button type="button" aria-label="Remove" onClick={() => removeFromSolution(i)} disabled={solved}>
                    ✕
                  </button>
                </span>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <div className="block-actions">
        <button type="button" onClick={check} disabled={solution.length === 0 || solved}>
          Check
        </button>
      </div>

      {result && (
        <p
          role={result.correct ? 'status' : 'alert'}
          className={`feedback ${result.correct ? 'feedback-correct' : 'feedback-incorrect'}`}
        >
          {result.correct
            ? 'Correct! The lines are in the right order.'
            : !result.orderCorrect
              ? 'Not quite — check the order of the lines.'
              : 'The order is right, but check the indentation (use ⇤ / ⇥).'}
        </p>
      )}
    </section>
  )
}

export function ParsonsProblemStep({ step, onComplete, onGraded }: StepRenderProps) {
  if (step.type !== 'parsons_problem') return null
  return (
    <ParsonsBody title={step.title} config={step.config} onComplete={onComplete} onGraded={onGraded} />
  )
}
