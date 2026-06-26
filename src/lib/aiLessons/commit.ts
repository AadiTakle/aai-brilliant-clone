// Single entry point for "charge Sparks + save the lesson". In production
// (VITE_AI_BACKEND=callable) the spend + write happen server-side in the
// Callable Function (trusted, not client-forgeable). In the default/stub/local
// path it runs as a client Firestore transaction so the feature is testable
// without deployed functions. Both honor the same fail-closed affordability rule.

import { httpsCallable } from 'firebase/functions'
import { type Firestore } from 'firebase/firestore'
import { functions } from '../../firebase/config'
import type { Lesson } from '../../content/schemas'
import { CUSTOM_LESSON_COST } from '../ai/cost'
import { validateGeneratedLesson } from '../ai/validate'
import { createCustomLesson, NotEnoughSparksError } from './store'
import type { AiLessonRecord, CustomLesson } from './types'

function isCallableBackend(): boolean {
  return import.meta.env.VITE_AI_BACKEND === 'callable'
}

export async function persistCustomLesson(
  db: Firestore,
  uid: string,
  lesson: Lesson,
  prompt: string,
  cost: number = CUSTOM_LESSON_COST,
  simplifiedWidgets?: boolean,
): Promise<CustomLesson> {
  if (!isCallableBackend()) {
    return createCustomLesson(db, uid, lesson, prompt, cost, simplifiedWidgets)
  }

  const fn = httpsCallable<
    { lessonJson: string; prompt: string; simplifiedWidgets?: boolean },
    AiLessonRecord
  >(functions, 'commitCustomLesson')
  let record: AiLessonRecord
  try {
    const res = await fn({ lessonJson: JSON.stringify(lesson), prompt, simplifiedWidgets })
    record = res.data
  } catch (err) {
    // The function throws a 'failed-precondition' for insufficient Sparks.
    if (err instanceof Error && /NOT_ENOUGH_SPARKS|failed-precondition/i.test(err.message)) {
      throw new NotEnoughSparksError()
    }
    throw err
  }

  const parsed = validateGeneratedLesson(JSON.parse(record.lessonJson))
  if (!parsed.ok) {
    throw new Error('The saved lesson failed validation on read.')
  }
  return {
    id: record.id,
    title: record.title,
    prompt: record.prompt,
    cost: record.cost,
    createdAt: record.createdAt,
    lesson: parsed.lesson,
    simplifiedWidgets: record.simplifiedWidgets,
  }
}
