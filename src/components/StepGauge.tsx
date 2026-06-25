interface StepGaugeProps {
  /** Completion flag per step, in order. */
  steps: boolean[]
  /** Index of the step currently being worked on. */
  currentIndex: number
}

/**
 * A machine-style segmented progress gauge: one lit segment per lesson step.
 * Completed segments glow circuit-green; the current one pulses. Replaces the
 * plain bar in the lesson header to read like a control panel readout.
 */
export function StepGauge({ steps, currentIndex }: StepGaugeProps) {
  const done = steps.filter(Boolean).length
  return (
    <div
      className="step-gauge"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={steps.length}
      aria-valuenow={done}
      aria-valuetext={`${done} of ${steps.length} steps complete`}
    >
      {steps.map((complete, i) => (
        <span
          key={i}
          className={`step-seg${complete ? ' is-done' : ''}${
            i === currentIndex ? ' is-current' : ''
          }`}
          aria-hidden="true"
        />
      ))}
    </div>
  )
}
