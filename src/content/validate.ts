import { lessonSchema, type Lesson } from './schemas'
import { rawLessons } from './lessons'

/** Validates a single raw lesson object. Throws ZodError on invalid content. */
export function validateLessonData(data: unknown): Lesson {
  return lessonSchema.parse(data)
}

export interface ValidationReport {
  ok: boolean
  results: { id: string; ok: boolean; error?: string }[]
}

/** Validates the entire lesson catalog and returns a structured report. */
export function validateAllLessons(): ValidationReport {
  const results = Object.entries(rawLessons).map(([id, data]) => {
    const parsed = lessonSchema.safeParse(data)
    return parsed.success
      ? { id, ok: true }
      : { id, ok: false, error: parsed.error.message }
  })
  return { ok: results.every((r) => r.ok), results }
}
