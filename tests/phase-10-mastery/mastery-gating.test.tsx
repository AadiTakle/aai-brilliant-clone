import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import { listLessons } from '../../src/content/loader'
import type { LessonProgress } from '../../src/lib/progress/model'
import type { UserProfile } from '../../src/lib/users'

// Control each lesson's stored progress without Firestore. saveMasteryAttempt is a
// no-op so the intro's auto-advance can't blow up trying to persist.
const loadLessonProgress =
  vi.fn<(db: unknown, uid: string, lessonId: string) => Promise<LessonProgress | null>>()
vi.mock('../../src/lib/progress/store', () => ({
  loadLessonProgress: (...args: [unknown, string, string]) => loadLessonProgress(...args),
  saveMasteryAttempt: vi.fn(async () => {}),
}))

// The AI Apply generator must never run for a gated entry; keep it inert either way.
vi.mock('../../src/lib/mastery/generateApply', () => ({
  generateApply: vi.fn(async () => ({ source: 'static', questions: [] })),
}))

const { AppRoutes } = await import('../../src/app/AppRoutes')
const { makeAuthValue, makeUser, renderWithAuth } = await import('../helpers/renderWithAuth')

const lessons = listLessons()
// L1 has graded steps; L9 is the finale with NO graded steps (its mastery IS the
// completion path), so the two exercise both halves of the guard.
const GRADED_LESSON = 'l1-talking-to-the-computer'
const L9 = 'l9-fizzbuzzpop'

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
  opts: { masteredLessons?: string[]; completedLessons?: string[] } = {},
): UserProfile {
  return {
    displayName: 'Ada',
    email: 'a@e.com',
    totalPoints: 0,
    currentStreak: 0,
    lastActiveDate: null,
    completedLessons: opts.completedLessons ?? [],
    masteredLessons: opts.masteredLessons ?? [],
    passedCheckpoints: [],
    activeDays: [],
  }
}

function renderMastery(lessonId: string, profile: UserProfile) {
  return renderWithAuth(<AppRoutes />, {
    authValue: makeAuthValue({ user: makeUser('Ada'), profile }),
    initialEntries: [`/lessons/${lessonId}/mastery`],
  })
}

describe('[Mastery] entry gating', () => {
  beforeEach(() => {
    loadLessonProgress.mockReset()
  })

  it('BLOCKS the challenge when the lesson has unfinished graded steps', async () => {
    loadLessonProgress.mockResolvedValue(null) // no step progress at all
    renderMastery(GRADED_LESSON, makeProfile())

    // The gated state, not the challenge, is shown.
    expect(
      await screen.findByRole('heading', { name: /finish the lesson first/i }),
    ).toBeInTheDocument()
    expect(screen.queryByText('Mastery Challenge')).not.toBeInTheDocument()
    // ...with a way back into the lesson (resume at the stored step).
    expect(screen.getByRole('link', { name: /back to the lesson/i })).toHaveAttribute(
      'href',
      `/lessons/${GRADED_LESSON}/step/0`,
    )
  })

  it('ALLOWS the challenge once every graded step is completed (local progress)', async () => {
    loadLessonProgress.mockImplementation(async (_db, _uid, lessonId) =>
      lessonId === GRADED_LESSON ? completeProgress(GRADED_LESSON) : null,
    )
    renderMastery(GRADED_LESSON, makeProfile())

    expect(await screen.findByText('Mastery Challenge')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /finish the lesson first/i })).not.toBeInTheDocument()
  })

  it('ALLOWS via the server-authoritative completedLessons even with no local doc', async () => {
    loadLessonProgress.mockResolvedValue(null)
    renderMastery(GRADED_LESSON, makeProfile({ completedLessons: [GRADED_LESSON] }))

    expect(await screen.findByText('Mastery Challenge')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /finish the lesson first/i })).not.toBeInTheDocument()
  })

  it('ALLOWS L9 (the finale has no graded steps) even with no progress', async () => {
    loadLessonProgress.mockResolvedValue(null)
    renderMastery(L9, makeProfile())

    expect(await screen.findByText('Mastery Challenge')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /finish the lesson first/i })).not.toBeInTheDocument()
  })

  it('ALLOWS a lesson already in masteredLessons (revisiting the finale)', async () => {
    loadLessonProgress.mockResolvedValue(null)
    renderMastery(GRADED_LESSON, makeProfile({ masteredLessons: [GRADED_LESSON] }))

    expect(await screen.findByText(/already mastered/i)).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /finish the lesson first/i })).not.toBeInTheDocument()
  })
})
