// Firestore persistence for custom AI lessons, stored per-user under
// users/{uid}/aiLessons/{id}. Saving a lesson also spends Sparks in the SAME
// transaction (fails closed if the learner cannot afford it), so a balance can
// never go negative and a lesson is never saved without payment.

import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  runTransaction,
  type Firestore,
} from 'firebase/firestore'
import type { Lesson } from '../../content/schemas'
import { CUSTOM_LESSON_COST } from '../ai/cost'
import { validateGeneratedLesson } from '../ai/validate'
import type { AiLessonRecord, CustomLesson } from './types'

export class NotEnoughSparksError extends Error {
  constructor() {
    super('NOT_ENOUGH_SPARKS')
    this.name = 'NotEnoughSparksError'
  }
}

/**
 * Charges `cost` Sparks and saves the lesson atomically. The lesson's id is set
 * to the new Firestore doc id so it is self-consistent. Returns the saved
 * (re-validated) custom lesson.
 */
export async function createCustomLesson(
  db: Firestore,
  uid: string,
  lesson: Lesson,
  prompt: string,
  cost: number = CUSTOM_LESSON_COST,
  simplifiedWidgets?: boolean,
): Promise<CustomLesson> {
  const ref = doc(collection(db, 'users', uid, 'aiLessons'))
  const id = ref.id
  const lessonWithId: Lesson = { ...lesson, id }
  const record: AiLessonRecord = {
    id,
    title: lessonWithId.title,
    prompt,
    cost,
    createdAt: new Date().toISOString(),
    lessonJson: JSON.stringify(lessonWithId),
    ...(simplifiedWidgets ? { simplifiedWidgets: true } : {}),
  }

  await runTransaction(db, async (tx) => {
    const userRef = doc(db, 'users', uid)
    const snap = await tx.get(userRef)
    const total = (snap.data()?.totalPoints ?? 0) as number
    if (total < cost) throw new NotEnoughSparksError()
    tx.update(userRef, { totalPoints: total - cost })
    tx.set(ref, record)
  })

  return {
    id,
    title: record.title,
    prompt,
    cost,
    createdAt: record.createdAt,
    lesson: lessonWithId,
    simplifiedWidgets: record.simplifiedWidgets,
  }
}

function recordToCustomLesson(record: AiLessonRecord): CustomLesson | null {
  let parsed: unknown
  try {
    parsed = JSON.parse(record.lessonJson)
  } catch {
    return null
  }
  // Re-validate on read: a stored lesson must still satisfy the live schema.
  const result = validateGeneratedLesson(parsed)
  if (!result.ok) return null
  return {
    id: record.id,
    title: record.title,
    prompt: record.prompt,
    cost: record.cost,
    createdAt: record.createdAt,
    lesson: result.lesson,
    simplifiedWidgets: record.simplifiedWidgets,
  }
}

export async function listCustomLessons(db: Firestore, uid: string): Promise<CustomLesson[]> {
  const q = query(collection(db, 'users', uid, 'aiLessons'), orderBy('createdAt', 'desc'))
  const snap = await getDocs(q)
  return snap.docs
    .map((d) => recordToCustomLesson(d.data() as AiLessonRecord))
    .filter((l): l is CustomLesson => l !== null)
}

export async function getCustomLesson(
  db: Firestore,
  uid: string,
  id: string,
): Promise<CustomLesson | null> {
  const snap = await getDoc(doc(db, 'users', uid, 'aiLessons', id))
  if (!snap.exists()) return null
  return recordToCustomLesson(snap.data() as AiLessonRecord)
}
