import type { z } from 'zod'
import type { StepComponent } from './types'
import type { StepType } from '../content/schemas'
import { ArticleStep } from './article/ArticleStep'
import { articleConfigSchema } from './article/schema'
import { BlockProblemStep } from './block_problem/BlockProblemStep'
import { blockProblemConfigSchema } from './block_problem/schema'
import { PythonSandboxStep } from './python_sandbox/PythonSandboxStep'
import { pythonSandboxConfigSchema } from './python_sandbox/schema'

export interface RegistryEntry {
  component: StepComponent
  configSchema: z.ZodTypeAny
}

// The single source of truth mapping a step `type` to its renderer + config
// schema. Adding a new problem type means adding one entry here.
export const problemRegistry: Record<StepType, RegistryEntry> = {
  article: { component: ArticleStep, configSchema: articleConfigSchema },
  block_problem: { component: BlockProblemStep, configSchema: blockProblemConfigSchema },
  python_sandbox: { component: PythonSandboxStep, configSchema: pythonSandboxConfigSchema },
}

export function getRenderer(type: string): RegistryEntry | null {
  return Object.prototype.hasOwnProperty.call(problemRegistry, type)
    ? problemRegistry[type as StepType]
    : null
}
