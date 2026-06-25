import { useState } from 'react'
import type { CheckpointBlock } from './schema'
import { WidgetFrame } from './widgets/WidgetFrame'
import { useReducedMotion } from '../../lib/ui/motion'

interface CheckpointProps {
  block: CheckpointBlock
  onComplete?: () => void
}

export function Checkpoint({ block, onComplete }: CheckpointProps) {
  const reduced = useReducedMotion()
  const [selected, setSelected] = useState<number | null>(null)
  const [result, setResult] = useState<'correct' | 'incorrect' | null>(null)

  function check() {
    if (selected === null) return
    if (selected === block.answerIndex) {
      setResult('correct')
      onComplete?.()
    } else {
      setResult('incorrect')
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
                  disabled={solved}
                  onChange={() => setSelected(i)}
                />
                <span>{choice}</span>
              </label>
            </li>
          )
        })}
      </ul>

      {!solved && (
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
        <p role="alert" className="feedback feedback-incorrect">
          {block.feedback?.incorrect ?? 'Not quite — try again.'}
        </p>
      )}
    </WidgetFrame>
  )
}
