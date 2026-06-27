import { useEffect } from 'react'
import { motion } from 'motion/react'
import { useReducedMotion } from '../../lib/ui/motion'
import { MasteryGearStar } from './MasteryIcon'

// Cinematic open: the content area has emptied; the gear+star icon stamps in and
// the words "Mastery Challenge" rise, then we hand off to the arena. With reduced
// motion it snaps and advances almost immediately.
export function MasteryIntro({ onDone }: { onDone: () => void }) {
  const reduced = useReducedMotion()

  useEffect(() => {
    const t = setTimeout(onDone, reduced ? 350 : 2600)
    return () => clearTimeout(t)
  }, [onDone, reduced])

  return (
    <div className="mastery-intro" role="status" aria-live="polite">
      <motion.div
        className="mastery-intro-icon"
        initial={reduced ? { opacity: 1 } : { scale: 0.3, rotate: -120, opacity: 0 }}
        animate={{ scale: 1, rotate: 0, opacity: 1 }}
        transition={
          reduced
            ? { duration: 0 }
            : { type: 'spring', stiffness: 180, damping: 13, delay: 0.15 }
        }
      >
        <MasteryGearStar />
      </motion.div>
      <motion.p
        className="mastery-intro-title"
        initial={reduced ? { opacity: 1 } : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={reduced ? { duration: 0 } : { delay: 0.7, duration: 0.5 }}
      >
        Mastery Challenge
      </motion.p>
    </div>
  )
}
