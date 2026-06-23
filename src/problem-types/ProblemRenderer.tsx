import { getRenderer } from './registry'
import { UnknownStep } from './UnknownStep'
import type { StepRenderProps } from './types'

export function ProblemRenderer(props: StepRenderProps) {
  const entry = getRenderer(props.step.type)
  if (!entry) {
    return <UnknownStep {...props} />
  }
  const Component = entry.component
  return <Component {...props} />
}
