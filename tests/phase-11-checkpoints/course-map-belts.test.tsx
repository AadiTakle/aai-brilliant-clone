import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { CourseMap } from '../../src/components/course/CourseMap'
import { getLesson } from '../../src/content/loader'
import { getLessonMeta } from '../../src/content/course'
import type { Lesson } from '../../src/content/schemas'
import type { CourseLessonState, CourseState } from '../../src/lib/progress/useCourseProgress'

// The course path inserts a checkpoint barrier node between L3 and L4. Each belt
// segment is the connector feeding the node directly below it, so:
//   L3 → checkpoint  lights once L3 is complete
//   checkpoint → L4  lights once the checkpoint is passed
// This pins that mapping (it used to be swapped: the L3→checkpoint belt tracked
// the pass and the checkpoint→L4 belt tracked L3, the exact reported symptom).
const L3 = getLesson('l3-doing-the-math')!
const L4 = getLesson('l4-true-or-false')!

function makeState(lesson: Lesson, index: number, overrides: Partial<CourseLessonState> = {}): CourseLessonState {
  return {
    lesson,
    meta: getLessonMeta(lesson.id, lesson.title),
    index,
    done: 0,
    total: lesson.steps.length,
    complete: false,
    mastered: false,
    started: false,
    unlocked: false,
    gatedBy: undefined,
    targetIndex: 0,
    cta: 'Start',
    ...overrides,
  }
}

function renderMap(opts: { l3Complete: boolean; passed: boolean }) {
  const l3 = makeState(L3, 0, { complete: opts.l3Complete, unlocked: true })
  const l4 = makeState(L4, 1, {
    unlocked: opts.l3Complete && opts.passed,
    gatedBy: {
      id: 'cp-foundations',
      title: 'Checkpoint: Your First Tools',
      passed: opts.passed,
      available: opts.l3Complete && !opts.passed,
    },
  })
  const courseState: CourseState = {
    lessons: [l3, l4],
    loading: false,
    completedLessons: opts.l3Complete ? 1 : 0,
    totalLessons: 2,
    currentIndex: 1,
  }
  return render(
    <MemoryRouter>
      <CourseMap courseState={courseState} />
    </MemoryRouter>,
  )
}

describe('[Phase 11] course-map belts around the checkpoint barrier', () => {
  it('lights the L3→checkpoint belt when L3 is complete, leaving checkpoint→L4 dark until the pass', () => {
    renderMap({ l3Complete: true, passed: false })
    expect(screen.getByTestId('belt-cp-foundations')).toHaveAttribute('data-filled', 'true')
    expect(screen.getByTestId('belt-l4-true-or-false')).toHaveAttribute('data-filled', 'false')
  })

  it('lights the checkpoint→L4 belt once the checkpoint is passed', () => {
    renderMap({ l3Complete: true, passed: true })
    expect(screen.getByTestId('belt-cp-foundations')).toHaveAttribute('data-filled', 'true')
    expect(screen.getByTestId('belt-l4-true-or-false')).toHaveAttribute('data-filled', 'true')
  })

  it('keeps both belts dark while L3 is unfinished', () => {
    renderMap({ l3Complete: false, passed: false })
    expect(screen.getByTestId('belt-cp-foundations')).toHaveAttribute('data-filled', 'false')
    expect(screen.getByTestId('belt-l4-true-or-false')).toHaveAttribute('data-filled', 'false')
  })
})
