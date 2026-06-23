import type { StepRenderProps } from '../types'

// Phase 2 stub. Replaced by the CodeMirror + Pyodide sandbox in Phase 5.
export function PythonSandboxStep({ step }: StepRenderProps) {
  return (
    <section className="problem problem-python" data-step-type="python_sandbox">
      <h2>{step.title ?? 'Python sandbox'}</h2>
      <p className="problem-stub">[python sandbox — Phase 5]</p>
    </section>
  )
}
