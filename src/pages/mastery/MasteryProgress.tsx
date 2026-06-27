import type { MasteryPhase } from '../../lib/mastery/attempt'

type SegState = 'idle' | 'active' | 'done'

function recallState(phase: MasteryPhase): SegState {
  if (phase === 'recall') return 'active'
  if (phase === 'apply' || phase === 'complete') return 'done'
  return 'idle'
}

function applyState(phase: MasteryPhase): SegState {
  if (phase === 'apply') return 'active'
  if (phase === 'complete') return 'done'
  return 'idle'
}

// The two-segment "Recall → Apply" tracker shown above the arena.
export function MasteryProgress({ phase }: { phase: MasteryPhase }) {
  return (
    <div className="mastery-progress" aria-label="Mastery challenge progress">
      <span className={`mastery-seg is-${recallState(phase)}`}>Recall</span>
      <span className="mastery-seg-arrow" aria-hidden="true">
        →
      </span>
      <span className={`mastery-seg is-${applyState(phase)}`}>Apply</span>
    </div>
  )
}
