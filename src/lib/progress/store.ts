// Firestore persistence for lesson progress + lifetime aggregates (Phase 6).

import {
  doc,
  getDoc,
  runTransaction,
  setDoc,
  type Firestore,
} from 'firebase/firestore'
import type { LessonProgress } from './model'
import { updateStreak, normalizeIsoDay } from './streak'
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
 * Atomically updates the user's lifetime total, and — only when an entire
 * lesson is completed — their daily streak, weekly activity, and completed
 * lessons. Points accrue per step; the streak only advances on full completion.
 * Run inside a transaction so concurrent step completions are safe.
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

    // Streak, weekly activity, and completed lessons only change once the
    // learner finishes the whole lesson.
    let currentStreak = data?.currentStreak ?? 0
    let lastActiveDate = data?.lastActiveDate ?? null
    const completedLessons = new Set(data?.completedLessons ?? [])
    const activeDays = new Set((data?.activeDays ?? []).map(normalizeIsoDay))

    if (input.lessonComplete) {
      const streak = updateStreak({ currentStreak, lastActiveDate }, input.today)
      currentStreak = streak.currentStreak
      lastActiveDate = streak.lastActiveDate
      completedLessons.add(input.lessonId)
      activeDays.add(normalizeIsoDay(input.today))
    }

    tx.set(
      ref,
      {
        totalPoints,
        currentStreak,
        lastActiveDate,
        completedLessons: [...completedLessons],
        activeDays: [...activeDays],
      },
      { merge: true },
    )
  })
}
