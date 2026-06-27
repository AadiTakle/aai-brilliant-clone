import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { LessonNode } from './LessonNode'
import { CheckpointNode } from './CheckpointNode'
import { LessonDetail } from './LessonDetail'
import { course } from '../../content/course'
import type { CourseState, CourseLessonState } from '../../lib/progress/useCourseProgress'

const stationVariants = {
  hidden: { opacity: 0, y: 16, scale: 0.9 },
  shown: { opacity: 1, y: 0, scale: 1 },
}

export function CourseMap({ courseState }: { courseState: CourseState }) {
  const navigate = useNavigate()
  const { lessons, currentIndex, completedLessons, totalLessons } = courseState
  // Until the learner taps a node, the selection follows the current lesson
  // (which resolves once progress loads). Deriving it avoids a sync effect.
  const [userSelected, setUserSelected] = useState<number | null>(null)
  const selectedIndex = userSelected ?? currentIndex
  const currentNodeRef = useRef<HTMLButtonElement>(null)

  // Auto-focus the path on the lesson you're currently on.
  useEffect(() => {
    const node = currentNodeRef.current
    if (!node?.scrollIntoView) return
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches
    node.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' })
  }, [currentIndex])

  const selected = lessons[selectedIndex] ?? lessons[currentIndex]

  function handleStart(state: CourseLessonState) {
    navigate(`/lessons/${state.lesson.id}/step/${state.targetIndex}`)
  }

  return (
    <div className="course-map-layout">
      <div className="course-map-head">
        <h1>{course.name}</h1>
        <p>
          {completedLessons} / {totalLessons} lessons complete
        </p>
      </div>

      <motion.ol
        className="course-path"
        initial="hidden"
        animate="shown"
        variants={{ shown: { transition: { staggerChildren: 0.08 } } }}
      >
        {lessons.flatMap((state, i) => {
          const isFinale = i === lessons.length - 1
          const prevComplete = i === 0 || lessons[i - 1].complete
          const gate = state.gatedBy
          const stations = []
          // A checkpoint barrier sits just BEFORE the lesson it gates.
          if (gate) {
            stations.push(
              <motion.li key={`cp-${gate.id}`} className="course-station" variants={stationVariants}>
                <span className="course-belt" aria-hidden="true">
                  <motion.span
                    className="course-belt-fill"
                    initial={{ scaleY: 0 }}
                    animate={{ scaleY: gate.passed ? 1 : 0 }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                  />
                </span>
                <CheckpointNode gate={gate} />
              </motion.li>,
            )
          }
          stations.push(
            <motion.li key={state.lesson.id} className="course-station" variants={stationVariants}>
              {i > 0 && (
                <span className="course-belt" aria-hidden="true">
                  <motion.span
                    className="course-belt-fill"
                    initial={{ scaleY: 0 }}
                    animate={{ scaleY: prevComplete ? 1 : 0 }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                  />
                </span>
              )}
              <LessonNode
                ref={i === currentIndex ? currentNodeRef : undefined}
                state={state}
                isCurrent={i === currentIndex}
                isSelected={i === selectedIndex}
                isFinale={isFinale}
                onSelect={setUserSelected}
              />
            </motion.li>,
          )
          return stations
        })}
      </motion.ol>

      <AnimatePresence mode="wait">
        {selected && (
          <motion.aside
            key={selected.lesson.id}
            className="course-detail"
            aria-label="Lesson details"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            <LessonDetail
              state={selected}
              prevTitle={selected.index > 0 ? lessons[selected.index - 1].meta.shortTitle : undefined}
              onStart={handleStart}
            />
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  )
}
