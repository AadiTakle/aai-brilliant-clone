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

export interface CourseLessonState {
  lesson: Lesson
  meta: LessonMeta
  index: number
  done: number
  total: number
  complete: boolean
  started: boolean
  /** A lesson unlocks once the previous one is complete (the first is always open). */
  unlocked: boolean
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
  const { user } = useAuth()
  const lessons = listLessons()
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
  const completion = lessons.map((lesson) => {
    const progress = progressByLesson[lesson.id]
    return progress ? isLessonComplete(progress, lesson) : false
  })

  const states: CourseLessonState[] = lessons.map((lesson, index) => {
    const progress = progressByLesson[lesson.id]
    const total = lesson.steps.length
    const done = progress ? completedCount(progress, lesson) : 0
    const resumeIndex = progress?.currentStepIndex ?? 0
    const complete = completion[index]
    const started = done > 0 || resumeIndex > 0
    // The first lesson is always open; the rest unlock when the prior completes.
    const unlocked = index === 0 || completion[index - 1]
    return {
      lesson,
      meta: getLessonMeta(lesson.id, lesson.title),
      index,
      done,
      total,
      complete,
      started,
      unlocked,
      // Completed lessons restart from the beginning for review.
      targetIndex: complete ? 0 : started ? resumeIndex : 0,
      cta: lessonCtaLabel(complete, started),
    }
  })

  const completedLessons = states.filter((s) => s.complete).length
  const firstActive = states.find((s) => s.unlocked && !s.complete)
  const currentIndex = firstActive ? firstActive.index : Math.max(0, states.length - 1)

  return {
    lessons: states,
    loading,
    completedLessons,
    totalLessons: lessons.length,
    currentIndex,
  }
}
