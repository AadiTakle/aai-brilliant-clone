import { useNavigate, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { useAuth } from '../auth/useAuth'
import { useCourseProgress } from '../lib/progress/useCourseProgress'
import { CourseCard } from '../components/course/CourseCard'
import { CourseMap } from '../components/course/CourseMap'
import './course/course.css'

export function CoursePage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const courseState = useCourseProgress()

  // The map only opens for signed-in learners; logged-out always sees the card.
  const showMap = user != null && searchParams.get('view') === 'map'

  function handleStart() {
    if (!user) {
      navigate('/sign-in')
      return
    }
    setSearchParams({ view: 'map' })
  }

  return (
    <main className="course-page">
      <AnimatePresence mode="wait" initial={false}>
        {showMap ? (
          <motion.div
            key="map"
            className="course-shell is-map"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.02 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            <CourseMap courseState={courseState} />
          </motion.div>
        ) : (
          <motion.div
            key="landing"
            className="course-shell is-landing"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.04 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            <CourseCard
              courseState={courseState}
              isSignedIn={user != null}
              onStart={handleStart}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  )
}
