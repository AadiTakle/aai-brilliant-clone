import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import { listLessons } from '../../src/content/loader'
import type { LessonProgress } from '../../src/lib/progress/model'
import type { UserProfile } from '../../src/lib/users'

// ResultsPage loads the finished lesson's progress from Firestore; mock it so we
// can hand it a fully-completed lesson without touching the network.
const loadLessonProgress =
  vi.fn<(db: unknown, uid: string, lessonId: string) => Promise<LessonProgress | null>>()
vi.mock('../../src/lib/progress/store', () => ({
  loadLessonProgress: (...args: [unknown, string, string]) => loadLessonProgress(...args),
}))

const { AppRoutes } = await import('../../src/app/AppRoutes')
const { makeAuthValue, makeUser, renderWithAuth } = await import('../helpers/renderWithAuth')

const lessons = listLessons()

function completeProgress(lessonId: string): LessonProgress {
  const lesson = lessons.find((l) => l.id === lessonId)
  if (!lesson) throw new Error(`unknown lesson ${lessonId}`)
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

function makeProfile(opts: { passedCheckpoints?: string[]; masteredLessons?: string[] } = {}): UserProfile {
  return {
    displayName: 'Ada',
    email: 'ada@example.com',
    totalPoints: 0,
    currentStreak: 0,
    lastActiveDate: null,
    completedLessons: [],
    masteredLessons: opts.masteredLessons ?? [],
    passedCheckpoints: opts.passedCheckpoints ?? [],
    activeDays: [],
  }
}

function renderResults(lessonId: string, profile: UserProfile) {
  return renderWithAuth(<AppRoutes />, {
    authValue: makeAuthValue({ user: makeUser('Ada'), profile }),
    initialEntries: [`/lessons/${lessonId}/results`],
  })
}

describe('[Phase 11] post-lesson CTA routes through the gating checkpoint', () => {
  beforeEach(() => {
    loadLessonProgress.mockReset()
  })

  it('after L3, the forward CTA leads to cp-foundations when it is not yet passed', async () => {
    loadLessonProgress.mockResolvedValue(completeProgress('l3-doing-the-math'))
    renderResults('l3-doing-the-math', makeProfile({ passedCheckpoints: [] }))

    const cta = await screen.findByRole('link', { name: /start checkpoint/i })
    expect(cta).toHaveAttribute('href', '/checkpoint/cp-foundations')
    // It must NOT jump straight to the still-locked next lesson.
    expect(
      screen.queryByRole('link', { name: /next lesson/i }),
    ).not.toBeInTheDocument()
  })

  it('after L6, the forward CTA leads to cp-control-flow when it is not yet passed', async () => {
    loadLessonProgress.mockResolvedValue(completeProgress('l6-over-and-over-again'))
    renderResults('l6-over-and-over-again', makeProfile({ passedCheckpoints: [] }))

    const cta = await screen.findByRole('link', { name: /start checkpoint/i })
    expect(cta).toHaveAttribute('href', '/checkpoint/cp-control-flow')
  })

  it('once the checkpoint is passed, the CTA is the normal next lesson', async () => {
    loadLessonProgress.mockResolvedValue(completeProgress('l3-doing-the-math'))
    renderResults('l3-doing-the-math', makeProfile({ passedCheckpoints: ['cp-foundations'] }))

    const cta = await screen.findByRole('link', { name: /next lesson/i })
    expect(cta).toHaveAttribute('href', '/lessons/l4-true-or-false/step/0')
  })

  it('keeps the normal next-lesson CTA when no checkpoint gates the next lesson', async () => {
    loadLessonProgress.mockResolvedValue(completeProgress('l1-talking-to-the-computer'))
    renderResults('l1-talking-to-the-computer', makeProfile())

    const cta = await screen.findByRole('link', { name: /next lesson/i })
    expect(cta).toHaveAttribute('href', '/lessons/l2-boxes-that-remember/step/0')
  })
})
