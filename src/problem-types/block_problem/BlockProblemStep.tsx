import { useReducer, useState } from 'react'
import { DndContext, type DragEndEvent } from '@dnd-kit/core'
import type { StepRenderProps } from '../types'
import type { BlockProblemConfig } from './schema'
import { compileToSource } from '../../lib/blocks/compiler'
import { gradeOutput, type GradeResult } from '../../lib/grading/outputGrader'
import { diagnose } from '../../lib/grading/diagnostics'
import { runPython } from '../../lib/pyodide/runner'
import {
  findBlock,
  hydrate,
  initialWorkspace,
  workspaceReducer,
  type DropTarget,
} from '../../lib/blocks/workspace'
import { blockCategory, getBlockDef } from '../../lib/blocks/definitions'
import { missingConstructsNode } from '../../lib/blocks/analysis'
import { constructHint, effectiveConstructs, type Construct } from '../../lib/grading/constructCheck'
import { Palette } from './Palette'
import { WorkspaceView } from './WorkspaceView'

interface BodyProps {
  title?: string
  config: BlockProblemConfig
  onComplete?: () => void
  onGraded?: (result: { correct: boolean }) => void
}

function BlockProblemBody({ title, config, onComplete, onGraded }: BodyProps) {
  const [state, dispatch] = useReducer(workspaceReducer, config.initial, initialWorkspace)
  const [running, setRunning] = useState(false)
  const [output, setOutput] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [grade, setGrade] = useState<GradeResult | null>(null)
  const [missing, setMissing] = useState<Construct[]>([])

  const graded = config.mode !== 'sandbox' && config.expectedOutput !== undefined

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over) return
    const type = String(active.id).replace('palette:', '')
    const [, parentRaw, slot] = String(over.id).split(':')
    const parentId = parentRaw === 'root' ? null : parentRaw

    // Only allow value blocks into expression slots and statements into
    // statement slots (the root program is a statement list).
    const slotKind =
      parentId === null
        ? 'statement'
        : getBlockDef(findBlock(state.program, parentId)?.type ?? '')?.slots.find(
            (s) => s.name === slot,
          )?.kind ?? 'statement'
    const isValue = blockCategory(type) === 'value'
    if ((slotKind === 'expression') !== isValue) return

    const target: DropTarget = { parentId, slot }
    dispatch({ kind: 'hold', blockType: type })
    dispatch({ kind: 'place', target })
  }

  async function run() {
    setRunning(true)
    setError(null)
    setGrade(null)
    setMissing([])
    const source = compileToSource(state.program)
    try {
      const result = await runPython(source)
      setOutput(result.stdout)
      setError(result.error)
      if (graded && config.expectedOutput !== undefined) {
        const g = gradeOutput(result.stdout, config.expectedOutput)
        const outputCorrect = g.correct && !result.error
        const required = effectiveConstructs({
          requireLoop: config.requireLoop,
          requiredConstructs: config.requiredConstructs,
        })
        const missingConstructs = outputCorrect ? missingConstructsNode(state.program, required) : []
        const correct = outputCorrect && missingConstructs.length === 0
        setGrade({ ...g, correct })
        setMissing(missingConstructs)
        onGraded?.({ correct })
        if (correct) onComplete?.()
      } else {
        onComplete?.()
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setRunning(false)
    }
  }

  return (
    <section className="problem problem-block" data-step-type="block_problem">
      {title && <h2>{title}</h2>}
      <p className="block-prompt">{config.prompt}</p>

      <DndContext onDragEnd={handleDragEnd}>
        <div className="block-layout">
          <Palette
            types={config.palette}
            heldType={state.held}
            onPick={(t) => dispatch({ kind: 'hold', blockType: state.held === t ? null : t })}
          />
          <WorkspaceView state={state} dispatch={dispatch} />
        </div>
      </DndContext>

      {state.held && (
        <p className="block-hint">
          Drag it, or tap a <strong>“place here”</strong> spot to drop your block.
        </p>
      )}

      <div className="block-actions">
        <button type="button" onClick={run} disabled={running}>
          {running ? 'Running…' : 'Run'}
        </button>
        {config.initial.length > 0 && (
          <button
            type="button"
            className="ghost"
            onClick={() => dispatch({ kind: 'reset', program: hydrate(config.initial) })}
          >
            Reset
          </button>
        )}
      </div>

      {running && (
        <p className="muted">Loading Python the first time can take a few seconds…</p>
      )}

      {output !== null && (
        <pre className="console" aria-label="output">
          {output.trim() ? output : '(no output)'}
        </pre>
      )}

      {error && <p className="feedback feedback-incorrect">Error: {error}</p>}

      {graded && grade && !error && (
        grade.correct ? (
          <p role="status" className="feedback feedback-correct">
            Correct! Your program produced the expected output.
          </p>
        ) : missing.length > 0 ? (
          <p role="alert" className="feedback feedback-incorrect">
            {constructHint(missing)}
          </p>
        ) : (
          <p role="alert" className="feedback feedback-incorrect">
            Not quite — compare your output to the goal and adjust your blocks.
          </p>
        )
      )}

      {graded && !grade?.correct && missing.length === 0 && (() => {
        const hint = diagnose({
          expected: config.expectedOutput,
          actual: output ?? '',
          stderr: error,
          source: compileToSource(state.program),
        })
        return hint ? <p className="feedback-hint">Hint: {hint}</p> : null
      })()}
    </section>
  )
}

export function BlockProblemStep({ step, onComplete, onGraded }: StepRenderProps) {
  if (step.type !== 'block_problem') return null
  return (
    <BlockProblemBody
      title={step.title}
      config={step.config}
      onComplete={onComplete}
      onGraded={onGraded}
    />
  )
}
