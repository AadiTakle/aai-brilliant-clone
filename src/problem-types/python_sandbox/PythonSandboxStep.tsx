import { useRef, useState } from 'react'
import CodeMirror, { type ReactCodeMirrorRef } from '@uiw/react-codemirror'
import { python } from '@codemirror/lang-python'
import type { StepRenderProps } from '../types'
import type { PythonSandboxConfig } from './schema'
import { runPython } from '../../lib/pyodide/runner'
import { gradePython, isPythonGraded, type PythonGradeResult } from '../../lib/grading/pythonGrader'
import { constructHint } from '../../lib/grading/constructCheck'
import { diagnose } from '../../lib/grading/diagnostics'
import { useResolvedTheme } from '../../theme/useResolvedTheme'

// Symbols/snippets that are awkward to type on mobile keyboards.
const SYMBOLS: { label: string; insert: string; desc: string }[] = [
  { label: '⇥', insert: '    ', desc: 'Insert indent' },
  { label: ':', insert: ':', desc: 'Insert colon' },
  { label: '( )', insert: '()', desc: 'Insert parentheses' },
  { label: '"', insert: '""', desc: 'Insert quotes' },
  { label: '[ ]', insert: '[]', desc: 'Insert brackets' },
  { label: '=', insert: '=', desc: 'Insert equals' },
  { label: 'print', insert: 'print()', desc: 'Insert print()' },
  { label: 'range', insert: 'range()', desc: 'Insert range()' },
  { label: 'input', insert: 'input()', desc: 'Insert input()' },
]

interface BodyProps {
  title?: string
  config: PythonSandboxConfig
  onComplete?: () => void
  onGraded?: (result: { correct: boolean }) => void
}

function PythonSandboxBody({ title, config, onComplete, onGraded }: BodyProps) {
  const editorRef = useRef<ReactCodeMirrorRef>(null)
  const theme = useResolvedTheme()
  const [code, setCode] = useState(config.starterCode)
  const [running, setRunning] = useState(false)
  const [output, setOutput] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [grade, setGrade] = useState<PythonGradeResult | null>(null)
  const [solved, setSolved] = useState(false)
  // Bumped on every Run so a repeated failure re-keys (and replays) the
  // incorrect-feedback shake rather than leaving it statically mounted.
  const [attempt, setAttempt] = useState(0)

  const graded = isPythonGraded(config.testCases)

  function insertSymbol(text: string) {
    const view = editorRef.current?.view
    if (!view) return
    const { from, to } = view.state.selection.main
    // Place the cursor inside paired delimiters / after the inserted text.
    const caret = text.endsWith(')') || text.endsWith(']') || text.endsWith('"') ? from + text.length - 1 : from + text.length
    view.dispatch({ changes: { from, to, insert: text }, selection: { anchor: caret } })
    view.focus()
  }

  async function run() {
    setAttempt((a) => a + 1)
    setRunning(true)
    setError(null)
    setGrade(null)
    setOutput(null)
    try {
      if (graded) {
        const result = await gradePython(code, config.testCases, undefined, {
          requireLoop: config.requireLoop,
          requiredConstructs: config.requiredConstructs,
          lenient: config.lenient,
        })
        setGrade(result)
        onGraded?.({ correct: result.passed })
        if (result.passed) {
          setSolved(true)
          onComplete?.()
        }
      } else {
        const { stdout, error: runError } = await runPython(code)
        setOutput(stdout)
        setError(runError)
        setSolved(true)
        onComplete?.()
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setRunning(false)
    }
  }

  return (
    <section
      className={`problem problem-python${solved ? ' is-energized' : ''}`}
      data-step-type="python_sandbox"
    >
      {title && <h2>{title}</h2>}
      <p className="block-prompt">{config.prompt}</p>

      <div className="symbol-toolbar" aria-label="Symbol toolbar">
        {SYMBOLS.map((s) => (
          <button
            key={s.label}
            type="button"
            className="symbol-key"
            aria-label={s.desc}
            onClick={() => insertSymbol(s.insert)}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="code-editor">
        <CodeMirror
          ref={editorRef}
          value={code}
          height="180px"
          theme={theme === 'dark' ? 'dark' : 'light'}
          extensions={[python()]}
          onChange={(value) => setCode(value)}
          basicSetup={{ lineNumbers: true, foldGutter: false }}
        />
      </div>

      <div className="block-actions">
        <button type="button" className="btn-machine" onClick={run} disabled={running}>
          {running ? 'Running…' : 'Run'}
        </button>
        <button
          type="button"
          className="btn-ghost"
          onClick={() => {
            setSolved(false)
            setCode(config.starterCode)
          }}
          disabled={running}
        >
          Reset code
        </button>
      </div>

      {running && (
        <p className="muted" aria-live="polite">
          Loading Python the first time can take a few seconds…
        </p>
      )}

      {output !== null && (
        <pre className="console" aria-label="output">
          {output.trim() ? output : '(no output)'}
        </pre>
      )}
      {error && (
        <p key={`err-${attempt}`} role="alert" className="feedback feedback-incorrect">
          Error: {error}
        </p>
      )}

      {grade && (
        <div className="test-results" aria-label="Test results" aria-live="polite">
          {grade.results.map((r, i) => (
            <div key={i} className={`test-result ${r.passed ? 'is-pass' : 'is-fail'}`}>
              <div className="test-result-head">
                <span className="test-result-status">{r.passed ? '✓' : '✗'}</span>
                <span>
                  Test {i + 1}
                  {r.stdin ? ` (input: ${r.stdin.replace(/\n/g, ' ')})` : ''}
                </span>
              </div>
              {!r.passed && (
                <div className="test-result-detail">
                  {r.error ? (
                    <p>Error: {r.error}</p>
                  ) : (
                    <p>
                      Expected <code>{r.expected.replace(/\n/g, '⏎')}</code>, got{' '}
                      <code>{r.actual.trim().replace(/\n/g, '⏎') || '(nothing)'}</code>
                    </p>
                  )}
                  {(() => {
                    const hint = diagnose({ kind: 'python', expected: r.expected, actual: r.actual, stderr: r.error, source: code })
                    return hint ? <p className="test-result-hint">Hint: {hint}</p> : null
                  })()}
                  {r.feedback && <p className="test-result-feedback">{r.feedback}</p>}
                </div>
              )}
            </div>
          ))}
          <p
            key={grade.passed ? 'pass' : `fail-${attempt}`}
            role={grade.passed ? 'status' : 'alert'}
            className={`feedback ${grade.passed ? 'feedback-correct' : 'feedback-incorrect'}`}
          >
            {grade.passed
              ? config.successMessage ?? 'All tests passed!'
              : grade.missingConstructs.length > 0
                ? constructHint(grade.missingConstructs)
                : 'Some tests failed — tweak your code and run again.'}
          </p>
        </div>
      )}
    </section>
  )
}

export function PythonSandboxStep({ step, onComplete, onGraded }: StepRenderProps) {
  if (step.type !== 'python_sandbox') return null
  return (
    <PythonSandboxBody
      title={step.title}
      config={step.config}
      onComplete={onComplete}
      onGraded={onGraded}
    />
  )
}
