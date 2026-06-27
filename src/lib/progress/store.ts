// Firestore persistence for per-lesson gameplay/resume state (current step,
// per-step status, last submission). Lifetime Spark aggregates are NOT written
// here — they are awarded server-side by the recordStepCompletion Cloud Function
// (see src/lib/progress/rewards.ts) so a balance can never be forged client-side.

import {
  doc,
  getDoc,
  setDoc,
  type Firestore,
} from 'firebase/firestore'
import type { LessonProgress } from './model'
import type { MasteryAttempt } from '../mastery/attempt'

export function progressDocId(uid: string, lessonId: string): string {
  return `${uid}_${lessonId}`
}

export async function loadLessonProgress(
  db: Firestore,
  uid: string,
  lessonId: string,
): Promise<LessonProgress | null> {
  const snap = await getDoc(doc(db, 'progress', progressDocId(uid, lessonId)))
  return snap.exists() ? (snap.data() as LessonProgress) : null
}

export async function saveLessonProgress(
  db: Firestore,
  uid: string,
  lessonId: string,
  progress: LessonProgress,
): Promise<void> {
  await setDoc(doc(db, 'progress', progressDocId(uid, lessonId)), progress, { merge: true })
}

/**
 * Persists just the in-progress Mastery Challenge state (resume-safe) without
 * touching the rest of the progress doc. The `mastery` field is client-owned;
 * the Spark award + `mastered` flag are written separately by the
 * commitMasteryCompletion Cloud Function.
 */
export async function saveMasteryAttempt(
  db: Firestore,
  uid: string,
  lessonId: string,
  mastery: MasteryAttempt,
): Promise<void> {
  await setDoc(doc(db, 'progress', progressDocId(uid, lessonId)), { mastery }, { merge: true })
}
