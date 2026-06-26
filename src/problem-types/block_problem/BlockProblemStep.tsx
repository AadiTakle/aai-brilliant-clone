import { Fragment, useReducer, useState } from 'react'
import {
  DndContext,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
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
import { blockCategory, getBlockDef, type CodeNode } from '../../lib/blocks/definitions'
import { comparesVariable, missingConstructsNode, printsVariable, reassignmentEditedEarlierNotLast } from '../../lib/blocks/analysis'
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
  const [state, dispatch] = useReducer(workspaceReducer, undefined, () =>
    initialWorkspace(config.initial, config.lockBlocks),
  )
  const [running, setRunning] = useState(false)
  const [output, setOutput] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [grade, setGrade] = useState<GradeResult | null>(null)
  const [missing, setMissing] = useState<Construct[]>([])
  const [printVarMissing, setPrintVarMissing] = useState(false)
  const [compareMissing, setCompareMissing] = useState(false)
  const [solved, setSolved] = useState(false)
  // Bumped on every Run so a repeated wrong result re-keys (and replays) the
  // incorrect-feedback shake instead of leaving it statically mounted.
  const [attempt, setAttempt] = useState(0)

  const graded = config.mode !== 'sandbox' && config.expectedOutput !== undefined

  // Split mouse/touch sensors so both pointers behave well:
  // - Mouse: a small drag distance distinguishes a click (tap-to-place) from a drag.
  // - Touch: a short press delay lets a quick tap fire the click fallback and lets
  //   a scroll gesture (movement before the delay) pass through to the page, so
  //   dragging a block no longer hijacks vertical scrolling on phones.
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  )

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
    setAttempt((a) => a + 1)
    setRunning(true)
    setError(null)
    setGrade(null)
    setMissing([])
    setPrintVarMissing(false)
    setCompareMissing(false)
    const source = compileToSource(state.program)
    try {
      const result = await runPython(source)
      setOutput(result.stdout)
      setError(result.error)
      if (graded && config.expectedOutput !== undefined) {
        const g = gradeOutput(result.stdout, config.expectedOutput, { lenient: config.lenient })
        const outputCorrect = g.correct && !result.error
        const required = effectiveConstructs({
          requireLoop: config.requireLoop,
          requiredConstructs: config.requiredConstructs,
        })
        const missingConstructs = outputCorrect ? missingConstructsNode(state.program, required) : []
        const skippedPrintVar =
          outputCorrect &&
          missingConstructs.length === 0 &&
          config.requirePrintVar !== undefined &&
          !printsVariable(state.program, config.requirePrintVar)
        const fakedCompare =
          outputCorrect &&
          missingConstructs.length === 0 &&
          !skippedPrintVar &&
          config.requireCompare !== undefined &&
          !comparesVariable(
            state.program,
            config.requireCompare.variable,
            config.requireCompare.op,
            config.requireCompare.against,
          )
        const correct =
          outputCorrect && missingConstructs.length === 0 && !skippedPrintVar && !fakedCompare
        setGrade({ ...g, correct })
        setMissing(missingConstructs)
        setPrintVarMissing(skippedPrintVar)
        setCompareMissing(fakedCompare)
        onGraded?.({ correct })
        if (correct) {
          setSolved(true)
          onComplete?.()
        }
      } else {
        setSolved(true)
        onComplete?.()
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setRunning(false)
    }
  }

  // A reassignment-specific, answer-free signal: the learner edited an earlier
  // assignment but left the final one untouched (the "last value wins" miss).
  const reassignWrongLine =
    graded &&
    grade !== null &&
    !grade.correct &&
    !error &&
    missing.length === 0 &&
    !printVarMissing &&
    !compareMissing &&
    config.reassignmentVar !== undefined &&
    reassignmentEditedEarlierNotLast(
      state.program,
      config.initial as CodeNode[],
      config.reassignmentVar,
    )

  return (
    <section
      className={`problem problem-block${solved ? ' is-energized' : ''}`}
      data-step-type="block_problem"
    >
      {title && <h2>{title}</h2>}
      <p className="block-prompt">{config.prompt}</p>

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="block-layout">
          <Palette
            types={config.palette}
            heldType={state.held}
            onPick={(t) => dispatch({ kind: 'hold', blockType: state.held === t ? null : t })}
          />
          <WorkspaceView state={state} dispatch={dispatch} locked={config.lockBlocks} />
        </div>
      </DndContext>

      {state.held && (
        <p className="block-hint">
          Drag it, or tap a <strong>“place here”</strong> spot to drop your block.
        </p>
      )}

      <div className="block-actions">
        <button type="button" className="btn-machine" onClick={run} disabled={running}>
          {running ? 'Running…' : 'Run'}
        </button>
        {config.initial.length > 0 && (
          <button
            type="button"
            className="btn-ghost"
            onClick={() => {
              setSolved(false)
              dispatch({ kind: 'reset', program: hydrate(config.initial) })
            }}
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

      {error && <p key={`err-${attempt}`} className="feedback feedback-incorrect">Error: {error}</p>}

      {graded && grade && !error && (
        <Fragment key={attempt}>{
        grade.correct ? (
          <p role="status" className="feedback feedback-correct">
            Correct! Your program produced the expected output.
          </p>
        ) : missing.length > 0 ? (
          <p role="alert" className="feedback feedback-incorrect">
            {constructHint(missing)}
          </p>
        ) : printVarMissing && config.requirePrintVar ? (
          <p role="alert" className="feedback feedback-incorrect">
            Let the box do the work — put the variable <code>{config.requirePrintVar}</code> inside{' '}
            <code>print()</code> instead of typing the text straight in.
          </p>
        ) : compareMissing && config.requireCompare ? (
          <p role="alert" className="feedback feedback-incorrect">
            Your yes/no question isn't checking the right thing. Make it compare your{' '}
            <code>{config.requireCompare.variable}</code> box — that's the leftover you just worked
            out.
          </p>
        ) : reassignWrongLine ? (
          <p role="alert" className="feedback feedback-incorrect">
            A box keeps only the value set on the line that runs <strong>last</strong>. Take another look
            at which assignment you actually changed.
          </p>
        ) : (
          <p role="alert" className="feedback feedback-incorrect">
            Not quite — compare your output to the goal and adjust your blocks.
          </p>
        )
        }</Fragment>
      )}

      {graded && !grade?.correct && missing.length === 0 && !printVarMissing && !compareMissing && !reassignWrongLine && (() => {
        const hint = diagnose({
          kind: 'block',
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
