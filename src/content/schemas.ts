import { z } from 'zod'
import { articleConfigSchema } from '../problem-types/article/schema'
import { blockProblemConfigSchema } from '../problem-types/block_problem/schema'
import { pythonSandboxConfigSchema } from '../problem-types/python_sandbox/schema'
import { parsonsProblemConfigSchema } from '../problem-types/parsons_problem/schema'

export const STEP_TYPES = ['article', 'block_problem', 'python_sandbox', 'parsons_problem'] as const
export type StepType = (typeof STEP_TYPES)[number]

const baseStepFields = {
  id: z.string().min(1),
  title: z.string().optional(),
  // Whether the step contributes to mastery/points (Phase 6).
  graded: z.boolean().default(false),
  // Base points before decay (Phase 6).
  points: z.number().int().positive().default(100),
  // Floor that linear decay cannot go below (Phase 6).
  minPoints: z.number().int().nonnegative().default(20),
}

export const articleStepSchema = z.object({
  ...baseStepFields,
  type: z.literal('article'),
  config: articleConfigSchema,
})

export const blockProblemStepSchema = z.object({
  ...baseStepFields,
  type: z.literal('block_problem'),
  config: blockProblemConfigSchema,
})

export const pythonSandboxStepSchema = z.object({
  ...baseStepFields,
  type: z.literal('python_sandbox'),
  config: pythonSandboxConfigSchema,
})

export const parsonsProblemStepSchema = z.object({
  ...baseStepFields,
  type: z.literal('parsons_problem'),
  config: parsonsProblemConfigSchema,
})

export const stepSchema = z.discriminatedUnion('type', [
  articleStepSchema,
  blockProblemStepSchema,
  pythonSandboxStepSchema,
  parsonsProblemStepSchema,
])

export const lessonSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  version: z.number().int().positive(),
  steps: z.array(stepSchema).min(1),
})

export type Step = z.infer<typeof stepSchema>
export type Lesson = z.infer<typeof lessonSchema>
