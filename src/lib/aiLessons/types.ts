import type { Lesson } from '../../content/schemas'

// How a custom lesson is stored under users/{uid}/aiLessons/{id}. The lesson is
// stored as a JSON string (lessonJson) rather than a nested object so we never
// hit Firestore's nested-array restrictions and so we always re-validate on read.
export interface AiLessonRecord {
  id: string
  title: string
  prompt: string
  cost: number
  createdAt: string
  lessonJson: string
  /** True when generation fell back to a restricted widget set. */
  simplifiedWidgets?: boolean
}

// The in-memory shape after a record has been read back and re-validated.
export interface CustomLesson {
  id: string
  title: string
  prompt: string
  cost: number
  createdAt: string
  lesson: Lesson
  simplifiedWidgets?: boolean
}
