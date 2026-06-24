import { z } from 'zod'

// An article is a sequence of panels. Each panel has at most a short line of
// text guidance and a single activity (a widget or a checkpoint) — Brilliant
// style. Panels are revealed one at a time; completing a panel's activity
// unlocks "Continue".

export const checkpointSchema = z.object({
  kind: z.literal('checkpoint'),
  prompt: z.string().min(1),
  choices: z.array(z.string().min(1)).min(2),
  answerIndex: z.number().int().nonnegative(),
  feedback: z
    .object({
      correct: z.string().optional(),
      incorrect: z.string().optional(),
    })
    .optional(),
})

export const widgetSchema = z.object({
  kind: z.literal('widget'),
  widget: z.enum([
    'repeated_addition',
    'loop_visualizer',
    'function_machine',
    'variable_box',
    'type_sorter',
    'remainder_machine',
    'multiples_grid',
    'comparison_explorer',
    'branch_visualizer',
    'code_tracer',
  ]),
  // Loose here; each widget component parses its own config with the strict
  // schemas below (problem-type owns its schema).
  config: z.record(z.string(), z.unknown()).default({}),
})

export const activitySchema = z.discriminatedUnion('kind', [checkpointSchema, widgetSchema])

export const panelSchema = z
  .object({
    text: z.string().optional(),
    activity: activitySchema.optional(),
  })
  .refine((p) => Boolean(p.text) || Boolean(p.activity), {
    message: 'A panel must have text, an activity, or both.',
  })

export const articleConfigSchema = z.object({
  panels: z.array(panelSchema).min(1),
})

// Strict per-widget config schemas, parsed by the widget components at render.
export const repeatedAdditionConfigSchema = z.object({
  value: z.number().int().positive(),
  target: z.number().int().positive(),
  caption: z.string().optional(),
})

export const loopVisualizerConfigSchema = z.object({
  iterations: z.number().int().positive(),
  action: z.string().default('print("Hello!")'),
  caption: z.string().optional(),
})

// --- Phase 9 widget config schemas (Python from Scratch curriculum) ---

// A function shown as a "machine": feed an input, see the output appear.
export const functionMachineConfigSchema = z.object({
  fnName: z.string().min(1),
  cases: z.array(z.object({ input: z.string(), output: z.string() })).min(1),
  caption: z.string().optional(),
})

// A named box that stores one value at a time; storing a new value forgets the old.
export const variableBoxConfigSchema = z.object({
  name: z.string().min(1),
  values: z.array(z.union([z.string(), z.number()])).min(1),
  caption: z.string().optional(),
})

// Sort each item into the "number" or "text" bucket.
export const typeSorterConfigSchema = z.object({
  items: z.array(z.object({ label: z.string().min(1), type: z.enum(['number', 'text']) })).min(2),
  caption: z.string().optional(),
})

// Step a counter and watch the remainder (n % divisor) cycle, hitting 0 on multiples.
export const remainderMachineConfigSchema = z.object({
  divisor: z.number().int().positive(),
  max: z.number().int().positive(),
  caption: z.string().optional(),
})

// A 1..upTo grid; the learner taps every multiple of `factor`.
export const multiplesGridConfigSchema = z.object({
  upTo: z.number().int().positive(),
  factor: z.number().int().positive(),
  caption: z.string().optional(),
})

// Pick two numbers and an operator; see the boolean result.
export const comparisonExplorerConfigSchema = z.object({
  left: z.number().int().default(3),
  right: z.number().int().default(5),
  caption: z.string().optional(),
})

// Step a value and see which if/elif/else branch runs (first matching divisor).
export const branchVisualizerConfigSchema = z.object({
  conditions: z.array(z.object({ divisor: z.number().int().positive(), label: z.string().min(1) })).min(1),
  elseLabel: z.string().default('print the number'),
  max: z.number().int().positive().default(15),
  caption: z.string().optional(),
})

// Step through an authored trace: highlight the current line, show variables + output.
export const codeTracerConfigSchema = z.object({
  code: z.array(z.string()).min(1),
  steps: z
    .array(
      z.object({
        line: z.number().int().nonnegative(),
        vars: z.record(z.string(), z.union([z.string(), z.number()])).default({}),
        output: z.string().optional(),
      }),
    )
    .min(1),
  caption: z.string().optional(),
})

export type ArticleConfig = z.infer<typeof articleConfigSchema>
export type Panel = z.infer<typeof panelSchema>
export type Activity = z.infer<typeof activitySchema>
export type CheckpointBlock = z.infer<typeof checkpointSchema>
export type RepeatedAdditionConfig = z.infer<typeof repeatedAdditionConfigSchema>
export type LoopVisualizerConfig = z.infer<typeof loopVisualizerConfigSchema>
export type FunctionMachineConfig = z.infer<typeof functionMachineConfigSchema>
export type VariableBoxConfig = z.infer<typeof variableBoxConfigSchema>
export type TypeSorterConfig = z.infer<typeof typeSorterConfigSchema>
export type RemainderMachineConfig = z.infer<typeof remainderMachineConfigSchema>
export type MultiplesGridConfig = z.infer<typeof multiplesGridConfigSchema>
export type ComparisonExplorerConfig = z.infer<typeof comparisonExplorerConfigSchema>
export type BranchVisualizerConfig = z.infer<typeof branchVisualizerConfigSchema>
export type CodeTracerConfig = z.infer<typeof codeTracerConfigSchema>
