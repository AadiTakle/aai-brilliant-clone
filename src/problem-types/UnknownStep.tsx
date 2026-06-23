import type { StepRenderProps } from './types'

// Safe fallback when a step's `type` has no registered renderer.
export function UnknownStep({ step }: StepRenderProps) {
  return (
    <section className="problem problem-unknown" role="alert" data-step-type="unknown">
      <h2>Unsupported step</h2>
      <p>
        This step type (<code>{step.type}</code>) can&apos;t be displayed yet.
      </p>
    </section>
  )
}
