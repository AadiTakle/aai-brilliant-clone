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
  widget: z.enum(['repeated_addition', 'loop_visualizer']),
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

export type ArticleConfig = z.infer<typeof articleConfigSchema>
export type Panel = z.infer<typeof panelSchema>
export type Activity = z.infer<typeof activitySchema>
export type CheckpointBlock = z.infer<typeof checkpointSchema>
export type RepeatedAdditionConfig = z.infer<typeof repeatedAdditionConfigSchema>
export type LoopVisualizerConfig = z.infer<typeof loopVisualizerConfigSchema>
