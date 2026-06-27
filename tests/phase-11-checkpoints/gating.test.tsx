import type { ReactNode } from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { AuthContext, type AuthContextValue } from '../../src/auth/context'
import { listLessons } from '../../src/content/loader'
import { checkpointGating } from '../../src/content/checkpoints'
import type { LessonProgress } from '../../src/lib/progress/model'
import type { UserProfile } from '../../src/lib/users'

// loadLessonProgress is mocked per-test so we control each lesson's completion
// without touching Firestore (mirrors the phase-10 useCourseProgress test).
const loadLessonProgress =
  vi.fn<(db: unknown, uid: string, lessonId: string) => Promise<LessonProgress | null>>()
vi.mock('../../src/lib/progress/store', () => ({
  loadLessonProgress: (...args: [unknown, string, string]) => loadLessonProgress(...args),
}))

const { useCourseProgress } = await import('../../src/lib/progress/useCourseProgress')

const lessons = listLessons()
// cp-foundations gates the lesson AFTER l3-doing-the-math (i.e. l4-true-or-false).
const GATE = 'cp-foundations'
const GATED_LESSON = 'l4-true-or-false'
const PRIOR_LESSONS = ['l1-talking-to-the-computer', 'l2-boxes-that-remember', 'l3-doing-the-math']
const gatedIndex = lessons.findIndex((l) => l.id === GATED_LESSON)

function completeProgress(lessonId: string): LessonProgress {
  const lesson = lessons.find((l) => l.id === lessonId)!
  const steps: LessonProgress['steps'] = {}
  for (const s of lesson.steps) {
    steps[s.id] = {
      status: 'completed',
      attempts: 1,
      wrongAttempts: 0,
      lastCorrect: true,
      pointsAwarded: 100,
    }
  }
  return { lessonVersion: lesson.version, currentStepIndex: 0, steps }
}

function makeProfile(
  opts: { masteredLessons?: string[]; passedCheckpoints?: string[]; completedLessons?: string[] } = {},
): UserProfile {
  return {
    displayName: 'A',
    email: 'a@e.com',
    totalPoints: 0,
    currentStreak: 0,
    lastActiveDate: null,
    completedLessons: opts.completedLessons ?? [],
    masteredLessons: opts.masteredLessons ?? [],
    passedCheckpoints: opts.passedCheckpoints ?? [],
    activeDays: [],
  }
}

function wrapper(profile: UserProfile) {
  const value: AuthContextValue = {
    user: { uid: 'u1' } as never,
    profile,
    loading: false,
    signUp: vi.fn(),
    signIn: vi.fn(),
    signInWithGoogle: vi.fn(),
    logOut: vi.fn(),
    refreshProfile: vi.fn(),
  }
  return ({ children }: { children: ReactNode }) => (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  )
}

describe('[Phase 11] checkpoint gating in useCourseProgress', () => {
  beforeEach(() => {
    loadLessonProgress.mockReset()
  })

  it('sanity: the gated lesson really sits behind cp-foundations', () => {
    expect(checkpointGating(GATED_LESSON)?.id).toBe(GATE)
  })

  it('locks the lesson after a checkpoint until that checkpoint is passed', async () => {
    // All lessons up to the gate are mastered (so the prior lesson is cleared),
    // but the checkpoint itself has NOT been passed.
    loadLessonProgress.mockResolvedValue(null)
    const { result } = renderHook(() => useCourseProgress(), {
      wrapper: wrapper(makeProfile({ masteredLessons: PRIOR_LESSONS, passedCheckpoints: [] })),
    })
    await waitFor(() => expect(result.current.loading).toBe(false))

    const gated = result.current.lessons[gatedIndex]
    expect(gated.unlocked).toBe(false)
    expect(gated.gatedBy).toEqual({
      id: GATE,
      title: expect.any(String),
      passed: false,
      available: true, // the prior lesson is cleared, so the gate is reachable now
    })
  })

  it('unlocks the lesson once the checkpoint id is in passedCheckpoints', async () => {
    loadLessonProgress.mockResolvedValue(null)
    const { result } = renderHook(() => useCourseProgress(), {
      wrapper: wrapper(makeProfile({ masteredLessons: PRIOR_LESSONS, passedCheckpoints: [GATE] })),
    })
    await waitFor(() => expect(result.current.loading).toBe(false))

    const gated = result.current.lessons[gatedIndex]
    expect(gated.unlocked).toBe(true)
    expect(gated.gatedBy?.passed).toBe(true)
  })

  it('unlocks via the server-authoritative completedLessons even when the local progress doc is gone', async () => {
    // The exact reported path: the learner FINISHED L1–L3 (so the reward Cloud
    // Functions recorded them in completedLessons) and PASSED cp-foundations, but
    // the per-lesson progress docs no longer report complete — e.g. a lesson
    // content/version bump orphaned them. The map must still treat L3 as cleared
    // and open L4; otherwise a passed checkpoint never unlocks its gated lesson.
    loadLessonProgress.mockResolvedValue(null)
    const { result } = renderHook(() => useCourseProgress(), {
      wrapper: wrapper(makeProfile({ completedLessons: PRIOR_LESSONS, passedCheckpoints: [GATE] })),
    })
    await waitFor(() => expect(result.current.loading).toBe(false))

    // L3 is counted complete from the server record (not the missing local doc)...
    const priorIndex = lessons.findIndex((l) => l.id === 'l3-doing-the-math')
    expect(result.current.lessons[priorIndex].complete).toBe(true)
    // ...so the gated lesson opens now that the checkpoint is also passed.
    const gated = result.current.lessons[gatedIndex]
    expect(gated.unlocked).toBe(true)
    expect(gated.gatedBy?.passed).toBe(true)
  })

  it('grandfathers a learner who already completed the gated lesson (never re-locks)', async () => {
    // The gated lesson is already complete via legacy step progress, but the
    // checkpoint was never passed — it must stay unlocked and show no barrier.
    loadLessonProgress.mockImplementation(async (_db, _uid, lessonId) =>
      lessonId === GATED_LESSON ? completeProgress(GATED_LESSON) : null,
    )
    const { result } = renderHook(() => useCourseProgress(), {
      wrapper: wrapper(makeProfile({ masteredLessons: PRIOR_LESSONS, passedCheckpoints: [] })),
    })
    await waitFor(() => expect(result.current.loading).toBe(false))

    const gated = result.current.lessons[gatedIndex]
    expect(gated.complete).toBe(true)
    expect(gated.unlocked).toBe(true)
    expect(gated.gatedBy).toBeUndefined()
  })
})
