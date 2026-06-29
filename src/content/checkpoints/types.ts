import { z } from 'zod'
import { MASTERY_CONCEPTS } from '../mastery/types'

// A Mastery Checkpoint: a cumulative, hard-gated recall quiz that sits AFTER a
// lesson and tests every concept taught up to that point. Questions are sampled
// from the existing per-lesson mastery recall banks (see lib/checkpoints).
//
// Pass rule (answer-once): the learner must clear BOTH an overall percentage
// (`overallThreshold`) AND a per-concept floor. The floor is a RATIO, not a
// fixed count, because some concepts have fewer than 3 recall items available
// (e.g. `range` has only 1): requiredCorrect = ceil(asked * perConceptFloorRatio),
// capped at the number asked. With the default 2/3 a concept asked 3 needs 2,
// asked 1 needs 1, asked 2 needs 2.
export const checkpointSpecSchema = z.object({
  id: z.string().min(1),
  // The lesson this checkpoint follows. The gate blocks the NEXT lesson until
  // this checkpoint is passed.
  afterLessonId: z.string().min(1),
  // Kid-facing briefing copy.
  title: z.string().min(1),
  blurb: z.string().min(1),
  // The concepts this checkpoint tests; at least one. Must be drawn from the
  // concepts taught up to `afterLessonId`.
  conceptPool: z.array(z.enum(MASTERY_CONCEPTS)).min(1),
  // How many recall items to sample per concept (fewer when the bank is smaller).
  perConceptCount: z.number().int().default(3),
  // Hard cap on the TOTAL questions shown. When the per-concept draw exceeds this,
  // it is trimmed fairly (round-robin across concepts) so coverage stays balanced
  // and the checkpoint never runs long.
  maxQuestions: z.number().int().positive().default(15),
  // Overall fraction of questions that must be correct to pass.
  overallThreshold: z.number().min(0).max(1).default(0.8),
  // Per-concept floor as a ratio of how many of that concept were asked.
  perConceptFloorRatio: z.number().default(2 / 3),
  // Sparks (the app's reward currency) granted the first time it is passed.
  sparksOnFirstPass: z.number().int().default(500),
})

export type CheckpointSpec = z.infer<typeof checkpointSpecSchema>
