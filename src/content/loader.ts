import { lessonSchema, type Lesson, type Step } from './schemas'
import { rawLessons } from './lessons'

const cache = new Map<string, Lesson>()

export function getLesson(lessonId: string): Lesson | null {
  if (cache.has(lessonId)) return cache.get(lessonId)!
  const raw = rawLessons[lessonId]
  if (raw === undefined) return null
  const lesson = lessonSchema.parse(raw)
  cache.set(lessonId, lesson)
  return lesson
}

export function listLessons(): Lesson[] {
  return Object.keys(rawLessons)
    .map((id) => getLesson(id))
    .filter((l): l is Lesson => l !== null)
}

export interface StepLocation {
  lesson: Lesson
  step: Step
  index: number
  total: number
  isFirst: boolean
  isLast: boolean
}

export function getStep(lessonId: string, index: number): StepLocation | null {
  const lesson = getLesson(lessonId)
  if (!lesson) return null
  if (!Number.isInteger(index) || index < 0 || index >= lesson.steps.length) return null
  return {
    lesson,
    step: lesson.steps[index],
    index,
    total: lesson.steps.length,
    isFirst: index === 0,
    isLast: index === lesson.steps.length - 1,
  }
}
