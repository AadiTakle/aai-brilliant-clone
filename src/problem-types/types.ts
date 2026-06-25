import type { Step } from '../content/schemas'

export interface StepResult {
  correct: boolean
}

export interface StepRenderProps {
  step: Step
  // Fired when an ungraded step has been sufficiently interacted with (Phase 3+).
  onComplete?: () => void
  // Fired when a graded step is submitted/evaluated (Phase 6 wires persistence).
  onGraded?: (result: StepResult) => void
  // True when the learner has already completed this step before (revisiting it).
  // Lets a step skip re-gating already-finished work (e.g. a multi-panel article
  // shows all its panels instead of forcing the learner to redo each activity).
  initiallyComplete?: boolean
}

export type StepComponent = React.ComponentType<StepRenderProps>
