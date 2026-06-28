// Orchestrates a single "make me a lesson" attempt with built-in self-healing.
//
// The Zod validator (validateGeneratedLesson) is the single source of truth for
// what a valid lesson looks like. Rather than surface its errors to the learner,
// we feed them straight back to the generator as a repair pass and try again.
//
// When the model repeatedly struggles with complex widgets (wrong config shapes,
// missing checkpoint feedback, etc.), we automatically fall back to a restricted
// widget vocabulary (`widgetMode: 'simple'`) and regenerate from scratch — faster
// and more reliable than many repair round-trips on a broken lesson.

import type { Lesson } from '../../content/schemas'
import type { AiGenerator, CustomLessonRequest } from './types'
import {
  extractReferenceSolutions,
  isWidgetRelatedErrors,
  selfTestLesson,
  validateGeneratedLesson,
  type SelfTestResult,
} from './validate'

export type WidgetMode = NonNullable<CustomLessonRequest['widgetMode']>

export type GenerateOutcome =
  | { kind: 'lesson'; lesson: Lesson; simplifiedWidgets?: boolean }
  | { kind: 'refused'; reason: string }
  | { kind: 'invalid'; errors: string[] }

export interface GenerateOptions {
  /** Total API attempts before giving up. Defaults to 4 (2 standard + 2 simple). */
  maxAttempts?: number
  /**
   * Runtime self-test (Pyodide). Injectable for tests; defaults to the real one.
   * Receives the per-step reference solutions captured from the raw model output
   * (stripped by the strict parse) so it can verify each sandbox's ground truth.
   */
  selfTest?: (lesson: Lesson, referenceSolutions: Record<string, string>) => Promise<SelfTestResult>
  /** Progress callback for UI status text. */
  onAttempt?: (info: { attempt: number; isRepair: boolean; widgetMode: WidgetMode }) => void
}

export async function generateValidatedLesson(
  generator: AiGenerator,
  prompt: string,
  options: GenerateOptions = {},
): Promise<GenerateOutcome> {
  const maxAttempts = Math.max(1, options.maxAttempts ?? 4)
  const runSelfTest =
    options.selfTest ??
    ((lesson: Lesson, refs: Record<string, string>) => selfTestLesson(lesson, undefined, refs))

  let widgetMode: WidgetMode = 'standard'
  let repair: CustomLessonRequest['repair']
  let lastErrors: string[] = []

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    options.onAttempt?.({ attempt, isRepair: repair !== undefined, widgetMode })
    const result = await generator.generate({ prompt, repair, widgetMode })

    if (!result.accepted) return { kind: 'refused', reason: result.reason }

    const validated = validateGeneratedLesson(result.lesson)
    if (validated.ok) {
      // Capture the raw reference solutions BEFORE the strict parse drops them, so
      // the self-test can prove each sandbox's ground truth actually works.
      const referenceSolutions = extractReferenceSolutions(result.lesson)
      const selfTest = await runSelfTest(validated.lesson, referenceSolutions)
      if (selfTest.ok) {
        return {
          kind: 'lesson',
          lesson: validated.lesson,
          simplifiedWidgets: widgetMode === 'simple',
        }
      }
      lastErrors = selfTest.failures.map((f) => `${f.stepId}: ${f.reason}`)
    } else {
      lastErrors = validated.errors
    }

    const widgetTrouble = isWidgetRelatedErrors(lastErrors)

    // Widget trouble in standard mode → switch to simple vocabulary and restart
    // fresh (no repair context from the broken complex widgets).
    if (widgetTrouble && widgetMode === 'standard') {
      widgetMode = 'simple'
      repair = undefined
      continue
    }

    // After two standard attempts, try simple mode before giving up.
    if (attempt >= 2 && widgetMode === 'standard') {
      widgetMode = 'simple'
      repair = undefined
      continue
    }

    repair = { lesson: result.lesson, errors: lastErrors }
  }

  return { kind: 'invalid', errors: lastErrors }
}
