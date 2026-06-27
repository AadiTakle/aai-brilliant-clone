import { useNavigate } from 'react-router-dom'

interface CheckpointNodeProps {
  gate: { id: string; title: string; passed: boolean; available: boolean }
}

// A barrier station on the course path. It mirrors LessonNode (a round-ish node
// + label, same aria shape) but represents a Mastery Checkpoint gate:
//   - locked:    the prior lesson isn't cleared yet — inert (disabled).
//   - available: reachable now — clickable, starts the checkpoint quiz.
//   - passed:    cleared — shows a ✓ and is non-blocking (revisitable for review).
export function CheckpointNode({ gate }: CheckpointNodeProps) {
  const navigate = useNavigate()
  const { id, title, passed, available } = gate
  const stateClass = passed ? 'is-passed' : available ? 'is-available' : 'is-locked'
  // Passed checkpoints are revisitable; available ones start the quiz; locked
  // ones are inert until the prior lesson is cleared.
  const interactive = passed || available
  const status = passed ? 'passed' : available ? 'available now' : 'locked'
  const shortTitle = title.replace(/^Checkpoint:\s*/i, '')

  return (
    <button
      type="button"
      className={`node-button checkpoint-node ${stateClass}`}
      aria-label={`${title}, ${status}`}
      disabled={!interactive}
      onClick={interactive ? () => navigate(`/checkpoint/${id}`) : undefined}
    >
      <span className="node-core checkpoint-node-core">
        <span className="node-face checkpoint-node-face">
          {passed ? (
            <span className="node-check" aria-hidden="true">
              {'\u2713'}
            </span>
          ) : available ? (
            <span className="checkpoint-node-flag" aria-hidden="true">
              {'\u2691'}
            </span>
          ) : (
            <span className="node-lock" aria-hidden="true">
              {'\u{1F512}'}
            </span>
          )}
        </span>
      </span>
      <span className="node-label checkpoint-node-label">
        <span className="node-num">Checkpoint</span>
        {shortTitle}
      </span>
    </button>
  )
}
