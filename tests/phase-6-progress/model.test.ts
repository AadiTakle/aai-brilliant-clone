import { describe, it, expect } from 'vitest'
import {
  advanceTo,
  applyResult,
  completedCount,
  emptyProgress,
  isLessonComplete,
  pointsEarned,
  type LessonProgress,
} from '../../src/lib/progress/model'
import type { Lesson } from '../../src/content/schemas'

const NOW = '2026-06-23T12:00:00.000Z'

function graded(stepId: string, p = emptyProgress(1), correct = true) {
  return applyResult(p, {
    stepId,
    graded: true,
    correct,
    basePoints: 100,
    minPoints: 20,
    now: NOW,
  })
}

describe('[Phase 6] progress model', () => {
  it('awards full points and completes on a first-try correct graded step', () => {
    const { progress, pointsDelta, justCompleted } = graded('a')
    expect(justCompleted).toBe(true)
    expect(pointsDelta).toBe(100)
    expect(progress.steps.a.status).toBe('completed')
    expect(progress.steps.a.completedAt).toBe(NOW)
  })

  it('counts wrong attempts and decays the eventual award', () => {
    let p: LessonProgress = emptyProgress(1)
    p = graded('a', p, false).progress
    p = graded('a', p, false).progress
    expect(p.steps.a.status).toBe('in_progress')
    expect(p.steps.a.wrongAttempts).toBe(2)

    const final = graded('a', p, true)
    expect(final.progress.steps.a.status).toBe('completed')
    expect(final.pointsDelta).toBe(68) // 100 − 2×16
  })

  it('is idempotent once a step is completed', () => {
    const first = graded('a')
    const again = graded('a', first.progress, true)
    expect(again.pointsDelta).toBe(0)
    expect(again.justCompleted).toBe(false)
  })

  it('awards full points for ungraded completion', () => {
    const { pointsDelta, justCompleted } = applyResult(emptyProgress(1), {
      stepId: 'intro',
      graded: false,
      correct: true,
      basePoints: 100,
      minPoints: 20,
      now: NOW,
    })
    expect(justCompleted).toBe(true)
    expect(pointsDelta).toBe(100)
  })

  it('advances the current step index only forward', () => {
    const p = advanceTo(advanceTo(emptyProgress(1), 3), 1)
    expect(p.currentStepIndex).toBe(3)
  })

  const lesson = {
    id: 'l',
    title: 'L',
    version: 1,
    steps: [
      { id: 'intro', type: 'article', graded: false },
      { id: 'q1', type: 'block_problem', graded: true },
      { id: 'q2', type: 'python_sandbox', graded: true },
    ],
  } as unknown as Lesson

  it('marks the lesson complete only when all graded steps are done', () => {
    let p = graded('q1').progress
    expect(isLessonComplete(p, lesson)).toBe(false)
    p = graded('q2', p).progress
    expect(isLessonComplete(p, lesson)).toBe(true)
  })

  it('tallies completed steps and points earned', () => {
    let p = applyResult(emptyProgress(1), {
      stepId: 'intro',
      graded: false,
      correct: true,
      basePoints: 100,
      minPoints: 20,
      now: NOW,
    }).progress
    p = graded('q1', p).progress
    expect(completedCount(p, lesson)).toBe(2)
    expect(pointsEarned(p)).toBe(200)
  })
})
