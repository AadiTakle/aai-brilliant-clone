import { useEffect, useState } from 'react'
import { useAuth } from '../../auth/useAuth'
import { db } from '../../firebase/config'
import { listLessons } from '../../content/loader'
import { getLessonMeta, type LessonMeta } from '../../content/course'
import { lessonCtaLabel } from '../ui/lessonCta'
import { loadLessonProgress } from './store'
import {
  completedCount,
  isLessonComplete,
  type LessonProgress,
} from './model'
import type { Lesson } from '../../content/schemas'
import { checkpointGating } from '../../content/checkpoints'

export interface CourseLessonState {
  lesson: Lesson
  meta: LessonMeta
  index: number
  done: number
  total: number
  complete: boolean
  /** The learner cleared this lesson's Mastery Challenge (gold on the map). */
  mastered: boolean
  started: boolean
  /** A lesson unlocks once the previous one is mastered or (legacy) complete AND
   *  any gating Mastery Checkpoint has been passed. The first is always open. */
  unlocked: boolean
  /** When a Mastery Checkpoint gates this lesson (and the learner isn't
   *  grandfathered past it), describes the barrier so the map can render it.
   *  `available` = reachable now (previous lesson cleared) but not yet passed. */
  gatedBy?: { id: string; title: string; passed: boolean; available: boolean }
  /** Step index the CTA jumps to (resume where you left off, or restart to review). */
  targetIndex: number
  cta: string
}

export interface CourseState {
  lessons: CourseLessonState[]
  loading: boolean
  completedLessons: number
  totalLessons: number
  /** First unlocked, not-yet-complete lesson — the node to auto-focus on. */
  currentIndex: number
}

export function useCourseProgress(): CourseState {
  const { user, profile } = useAuth()
  const lessons = listLessons()
  const masteredSet = new Set(profile?.masteredLessons ?? [])
  const passed = new Set(profile?.passedCheckpoints ?? [])
  const [progressByLesson, setProgressByLesson] = useState<Record<string, LessonProgress>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!user) {
        setProgressByLesson({})
        setLoading(false)
        return
      }
      setLoading(true)
      const entries = await Promise.all(
        lessons.map(async (l) => [l.id, await loadLessonProgress(db, user.uid, l.id)] as const),
      )
      if (cancelled) return
      const map: Record<string, LessonProgress> = {}
      for (const [id, p] of entries) if (p) map[id] = p
      setProgressByLesson(map)
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  // Completion is computed first so unlock state can look at the previous lesson
  // without mutating a variable across the render's map() (a React lint rule).
  // A lesson counts as "cleared" (for unlocking the next) when it is mastered OR
  // (grandfathered) already complete — so existing progress is never re-locked.
  const completion = lessons.map((lesson) => {
    const progress = progressByLesson[lesson.id]
    return progress ? isLessonComplete(progress, lesson) : false
  })
  const cleared = lessons.map((lesson, i) => completion[i] || masteredSet.has(lesson.id))

  const states: CourseLessonState[] = lessons.map((lesson, index) => {
    const progress = progressByLesson[lesson.id]
    const total = lesson.steps.length
    const done = progress ? completedCount(progress, lesson) : 0
    const resumeIndex = progress?.currentStepIndex ?? 0
    const complete = completion[index]
    const mastered = masteredSet.has(lesson.id)
    const started = done > 0 || resumeIndex > 0
    // A Mastery Checkpoint may gate this lesson: it must be passed before the
    // lesson unlocks — unless the learner is grandfathered (already cleared this
    // lesson), so existing progress is never re-locked.
    const gate = checkpointGating(lesson.id)
    const grandfathered = complete || mastered
    const checkpointClear = !gate || passed.has(gate.id) || grandfathered
    // The first lesson is always open; the rest unlock when the prior is cleared
    // AND any gating checkpoint is passed.
    const prevCleared = index === 0 || cleared[index - 1]
    const unlocked = prevCleared && checkpointClear
    const gatedBy =
      gate && !grandfathered
        ? {
            id: gate.id,
            title: gate.title,
            passed: passed.has(gate.id),
            available: prevCleared && !passed.has(gate.id),
          }
        : undefined
    const doneForCta = complete || mastered
    return {
      lesson,
      meta: getLessonMeta(lesson.id, lesson.title),
      index,
      done,
      total,
      complete,
      mastered,
      started,
      unlocked,
      gatedBy,
      // Cleared lessons restart from the beginning for review.
      targetIndex: doneForCta ? 0 : started ? resumeIndex : 0,
      cta: lessonCtaLabel(doneForCta, started),
    }
  })

  const completedLessons = states.filter((s) => s.complete || s.mastered).length
  const firstActive = states.find((s) => s.unlocked && !s.complete && !s.mastered)
  const currentIndex = firstActive ? firstActive.index : Math.max(0, states.length - 1)

  return {
    lessons: states,
    loading,
    completedLessons,
    totalLessons: lessons.length,
    currentIndex,
  }
}
