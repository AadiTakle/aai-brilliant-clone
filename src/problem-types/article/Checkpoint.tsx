import { useState } from 'react'
import type { CheckpointBlock } from './schema'
import { WidgetFrame } from './widgets/WidgetFrame'
import { useReducedMotion } from '../../lib/ui/motion'

interface CheckpointProps {
  block: CheckpointBlock
  onComplete?: () => void
  /** Fires on every Check with the result, so callers (e.g. the Mastery recall
   *  stage) can record a first-try miss. Optional + additive. */
  onResult?: (correct: boolean) => void
  /** Answer-once mode (Mastery Checkpoints): the first Check is final — the
   *  choices lock, the Check button hides, and onResult fires exactly once.
   *  Defaults off, so the retry-until-correct article/mastery behavior is
   *  byte-for-byte unchanged. */
  gradeOnce?: boolean
}

export function Checkpoint({ block, onComplete, onResult, gradeOnce = false }: CheckpointProps) {
  const reduced = useReducedMotion()
  const [selected, setSelected] = useState<number | null>(null)
  const [result, setResult] = useState<'correct' | 'incorrect' | null>(null)
  // Bumped on every Check so a repeated wrong answer re-keys (and replays) the
  // shake — otherwise the banner stays mounted and the animation never restarts.
  const [attempts, setAttempts] = useState(0)
  // Answer-once lock: set on the first Check when `gradeOnce`, so the learner
  // cannot retry and onResult fires exactly once.
  const [locked, setLocked] = useState(false)

  function check() {
    if (selected === null || locked) return
    setAttempts((a) => a + 1)
    if (gradeOnce) setLocked(true)
    if (selected === block.answerIndex) {
      setResult('correct')
      onResult?.(true)
      onComplete?.()
    } else {
      setResult('incorrect')
      onResult?.(false)
    }
  }

  const solved = result === 'correct'
  const status = solved ? 'done' : selected !== null || result ? 'running' : 'idle'

  return (
    <WidgetFrame
      kind="checkpoint"
      icon="✅"
      title="Checkpoint"
      status={status}
      reduced={reduced}
      className="widget-checkpoint checkpoint"
      dataAttrs={{ 'data-block': 'checkpoint' }}
    >
      <p className="checkpoint-prompt">{block.prompt}</p>
      <ul className="checkpoint-choices">
        {block.choices.map((choice, i) => {
          const id = `${block.prompt}-${i}`
          return (
            <li key={id}>
              <label className="choice">
                <input
                  type="radio"
                  name={block.prompt}
                  checked={selected === i}
                  disabled={solved || locked}
                  onChange={() => setSelected(i)}
                />
                <span>{choice}</span>
              </label>
            </li>
          )
        })}
      </ul>

      {!solved && !locked && (
        <button type="button" className="btn-machine" onClick={check} disabled={selected === null}>
          Check
        </button>
      )}

      {result === 'correct' && (
        <p role="status" className="feedback feedback-correct">
          {block.feedback?.correct ?? 'Correct!'}
        </p>
      )}
      {result === 'incorrect' && (
        <p key={attempts} role="alert" className="feedback feedback-incorrect">
          {block.feedback?.incorrect ?? 'Not quite — try again.'}
        </p>
      )}
    </WidgetFrame>
  )
}
