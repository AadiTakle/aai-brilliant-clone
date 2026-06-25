import { ProgressBar } from '../ProgressBar'
import { course } from '../../content/course'
import type { CourseState } from '../../lib/progress/useCourseProgress'

interface CourseCardProps {
  courseState: CourseState
  isSignedIn: boolean
  onStart: () => void
}

export function CourseCard({ courseState, isSignedIn, onStart }: CourseCardProps) {
  const { lessons, completedLessons, totalLessons, currentIndex } = courseState
  const startLabel = !isSignedIn
    ? 'Get Started'
    : completedLessons > 0
      ? 'Keep Learning'
      : 'Get Started'

  return (
    <div className="course-card">
      <p className="course-card-eyebrow">Course</p>
      <h1>{course.name}</h1>
      <p className="course-card-desc">{course.description}</p>

      <div className="course-teaser" aria-hidden="true">
        {lessons.map((l, i) => (
          <span
            key={l.lesson.id}
            className={`course-teaser-dot${l.complete ? ' is-done' : ''}${
              isSignedIn && i === currentIndex ? ' is-current' : ''
            }`}
          />
        ))}
      </div>

      <div className="course-card-progress">
        <ProgressBar
          completed={completedLessons}
          total={totalLessons}
          label="Lessons completed"
        />
        <span className="course-card-count">
          {completedLessons} / {totalLessons} lessons complete
        </span>
      </div>

      <button type="button" className="course-start" onClick={onStart}>
        {startLabel}
      </button>
      {!isSignedIn && (
        <p className="course-start-note">Free to start — sign in to save your progress.</p>
      )}
    </div>
  )
}
