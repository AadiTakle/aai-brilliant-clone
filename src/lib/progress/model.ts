// Type-agnostic lesson progress model + pure reducers (Phase 6).

import type { Lesson } from '../../content/schemas'
import type { MasteryAttempt } from '../mastery/attempt'
import { computeAwardedPoints } from './points'

export type StepStatus = 'not_started' | 'in_progress' | 'completed'

export interface StepProgress {
  status: StepStatus
  attempts: number
  wrongAttempts: number
  lastCorrect: boolean
  pointsAwarded: number
  completedAt?: string
  lastSubmission?: unknown
}

export interface LessonProgress {
  lessonVersion: number
  currentStepIndex: number
  steps: Record<string, StepProgress>
  /** In-progress Mastery Challenge state (client-owned, resume-safe). Absent
   *  until the learner enters the challenge after the last step. */
  mastery?: MasteryAttempt
}

export function emptyProgress(lessonVersion: number): LessonProgress {
  return { lessonVersion, currentStepIndex: 0, steps: {} }
}

export function getStepProgress(progress: LessonProgress, stepId: string): StepProgress {
  return (
    progress.steps[stepId] ?? {
      status: 'not_started',
      attempts: 0,
      wrongAttempts: 0,
      lastCorrect: false,
      pointsAwarded: 0,
    }
  )
}

export interface ResultInput {
  stepId: string
  graded: boolean
  correct: boolean
  basePoints: number
  minPoints: number
  submission?: unknown
  now: string
}

export interface ApplyResult {
  progress: LessonProgress
  /** Points to add to the learner's lifetime total (0 when nothing new earned). */
  pointsDelta: number
  justCompleted: boolean
}

/**
 * Applies a step submission/completion. Idempotent once a step is completed:
 * re-submitting a completed step earns no further points.
 */
export function applyResult(progress: LessonProgress, input: ResultInput): ApplyResult {
  const prev = getStepProgress(progress, input.stepId)

  if (prev.status === 'completed') {
    return { progress, pointsDelta: 0, justCompleted: false }
  }

  const attempts = prev.attempts + 1

  // A graded, incorrect submission counts as a wrong attempt and keeps the
  // step open. Ungraded steps complete on the first interaction.
  if (input.graded && !input.correct) {
    const step: StepProgress = {
      ...prev,
      status: 'in_progress',
      attempts,
      wrongAttempts: prev.wrongAttempts + 1,
      lastCorrect: false,
      lastSubmission: input.submission ?? prev.lastSubmission,
    }
    return {
      progress: { ...progress, steps: { ...progress.steps, [input.stepId]: step } },
      pointsDelta: 0,
      justCompleted: false,
    }
  }

  const awarded = input.graded
    ? computeAwardedPoints(input.basePoints, input.minPoints, prev.wrongAttempts)
    : input.basePoints

  const step: StepProgress = {
    status: 'completed',
    attempts,
    wrongAttempts: prev.wrongAttempts,
    lastCorrect: true,
    pointsAwarded: awarded,
    completedAt: input.now,
    lastSubmission: input.submission ?? prev.lastSubmission ?? null,
  }

  return {
    progress: { ...progress, steps: { ...progress.steps, [input.stepId]: step } },
    pointsDelta: awarded,
    justCompleted: true,
  }
}

export function advanceTo(progress: LessonProgress, index: number): LessonProgress {
  if (index <= progress.currentStepIndex) return progress
  return { ...progress, currentStepIndex: index }
}

export function completedCount(progress: LessonProgress, lesson: Lesson): number {
  return lesson.steps.filter((s) => progress.steps[s.id]?.status === 'completed').length
}

export function pointsEarned(progress: LessonProgress): number {
  return Object.values(progress.steps).reduce((sum, s) => sum + (s.pointsAwarded ?? 0), 0)
}

/** A lesson is complete once every graded step is completed. */
export function isLessonComplete(progress: LessonProgress, lesson: Lesson): boolean {
  const graded = lesson.steps.filter((s) => s.graded)
  if (graded.length === 0) return false
  return graded.every((s) => progress.steps[s.id]?.status === 'completed')
}
