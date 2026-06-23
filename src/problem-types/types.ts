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
}

export type StepComponent = React.ComponentType<StepRenderProps>
