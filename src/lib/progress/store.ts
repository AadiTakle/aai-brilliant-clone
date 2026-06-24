// Firestore persistence for lesson progress + lifetime aggregates (Phase 6).

import {
  doc,
  getDoc,
  runTransaction,
  setDoc,
  type Firestore,
} from 'firebase/firestore'
import type { LessonProgress } from './model'
import { updateStreak } from './streak'
import type { UserProfile } from '../users'

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

export interface RewardInput {
  pointsDelta: number
  today: string
  lessonId: string
  lessonComplete: boolean
}

/**
 * Atomically updates the user's lifetime total, daily streak, and completed
 * lessons. Run inside a transaction so concurrent step completions are safe.
 */
export async function commitStepRewards(
  db: Firestore,
  uid: string,
  input: RewardInput,
): Promise<void> {
  await runTransaction(db, async (tx) => {
    const ref = doc(db, 'users', uid)
    const snap = await tx.get(ref)
    const data = snap.data() as Partial<UserProfile> | undefined

    const totalPoints = (data?.totalPoints ?? 0) + input.pointsDelta
    const streak = updateStreak(
      {
        currentStreak: data?.currentStreak ?? 0,
        lastActiveDate: data?.lastActiveDate ?? null,
      },
      input.today,
    )

    const completedLessons = new Set(data?.completedLessons ?? [])
    if (input.lessonComplete) completedLessons.add(input.lessonId)

    tx.set(
      ref,
      {
        totalPoints,
        currentStreak: streak.currentStreak,
        lastActiveDate: streak.lastActiveDate,
        completedLessons: [...completedLessons],
      },
      { merge: true },
    )
  })
}
