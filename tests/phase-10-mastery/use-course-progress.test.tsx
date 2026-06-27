import type { ReactNode } from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { AuthContext, type AuthContextValue } from '../../src/auth/context'
import { listLessons } from '../../src/content/loader'
import type { LessonProgress } from '../../src/lib/progress/model'
import type { UserProfile } from '../../src/lib/users'

// loadLessonProgress is mocked per-test so we control each lesson's completion
// without touching Firestore.
const loadLessonProgress = vi.fn<(db: unknown, uid: string, lessonId: string) => Promise<LessonProgress | null>>()
vi.mock('../../src/lib/progress/store', () => ({
  loadLessonProgress: (...args: [unknown, string, string]) => loadLessonProgress(...args),
}))

const { useCourseProgress } = await import('../../src/lib/progress/useCourseProgress')

const lessons = listLessons()
const L1 = lessons[0].id
const L2 = lessons[1].id

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

function makeProfile(masteredLessons: string[]): UserProfile {
  return {
    displayName: 'A',
    email: 'a@e.com',
    totalPoints: 0,
    currentStreak: 0,
    lastActiveDate: null,
    completedLessons: [],
    masteredLessons,
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

describe('[Mastery] useCourseProgress mastered + unlock', () => {
  beforeEach(() => {
    loadLessonProgress.mockReset()
  })

  it('marks a lesson mastered from the profile and unlocks the next one', async () => {
    loadLessonProgress.mockResolvedValue(null) // no step progress anywhere
    const { result } = renderHook(() => useCourseProgress(), {
      wrapper: wrapper(makeProfile([L1])),
    })
    await waitFor(() => expect(result.current.loading).toBe(false))

    const [l1, l2] = result.current.lessons
    expect(l1.mastered).toBe(true)
    expect(l1.complete).toBe(false) // not graded-complete, but mastered
    // Mastering L1 unlocks L2 even with no step completion.
    expect(l2.unlocked).toBe(true)
  })

  it('grandfathers legacy completion: a complete (not mastered) lesson still unlocks the next', async () => {
    loadLessonProgress.mockImplementation(async (_db, _uid, lessonId) =>
      lessonId === L1 ? completeProgress(L1) : null,
    )
    const { result } = renderHook(() => useCourseProgress(), {
      wrapper: wrapper(makeProfile([])),
    })
    await waitFor(() => expect(result.current.loading).toBe(false))

    const [l1, l2] = result.current.lessons
    expect(l1.complete).toBe(true)
    expect(l1.mastered).toBe(false)
    expect(l2.unlocked).toBe(true)
  })

  it('keeps later lessons locked when the previous is neither mastered nor complete', async () => {
    loadLessonProgress.mockResolvedValue(null)
    const { result } = renderHook(() => useCourseProgress(), {
      wrapper: wrapper(makeProfile([])),
    })
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.lessons[0].unlocked).toBe(true) // first is always open
    expect(result.current.lessons[1].unlocked).toBe(false)
  })

  it('counts mastered lessons toward the completed tally', async () => {
    loadLessonProgress.mockResolvedValue(null)
    const { result } = renderHook(() => useCourseProgress(), {
      wrapper: wrapper(makeProfile([L1, L2])),
    })
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.completedLessons).toBe(2)
  })
})
