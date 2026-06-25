import { AnimatePresence, motion } from 'motion/react'
import { CURRENCY_GLYPH } from './Currency'
import { useReducedMotion } from '../lib/ui/motion'

interface SparkBurstProps {
  /** Sparks earned. When > 0 a burst plays; pair with `triggerKey` to replay. */
  amount: number
  /** Change this (e.g. an incrementing counter) to retrigger the same amount. */
  triggerKey: number
  /** Larger, louder burst for big moments (graded step) vs. inline widget done. */
  size?: 'sm' | 'lg'
}

const PARTICLES = 6

/**
 * The signature gamification flourish: a "+N ✦" that pops and rises, ringed by a
 * few gold sparkles. Reused on correct answers, finished widgets, and results.
 * Honors reduced motion (a quiet static "+N ✦" that fades).
 */
export function SparkBurst({ amount, triggerKey, size = 'sm' }: SparkBurstProps) {
  const reduced = useReducedMotion()
  if (amount <= 0) return null

  return (
    <span className={`spark-burst spark-burst-${size}`} aria-hidden="true">
      <AnimatePresence>
        <motion.span
          key={triggerKey}
          className="spark-burst-amount"
          initial={{ opacity: 0, y: reduced ? 0 : 10, scale: reduced ? 1 : 0.6 }}
          animate={{
            opacity: [0, 1, 1, 0],
            y: reduced ? 0 : [-2, -16, -26, -34],
            scale: reduced ? 1 : [0.6, 1.15, 1, 0.95],
          }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduced ? 0.8 : 1.1, ease: 'easeOut', times: [0, 0.2, 0.7, 1] }}
        >
          +{amount} {CURRENCY_GLYPH}
        </motion.span>
      </AnimatePresence>

      {!reduced && (
        <span key={`p-${triggerKey}`} className="spark-burst-particles">
          {Array.from({ length: PARTICLES }).map((_, i) => {
            const angle = (i / PARTICLES) * Math.PI * 2
            const dist = size === 'lg' ? 42 : 28
            return (
              <motion.span
                key={i}
                className="spark-burst-particle"
                initial={{ opacity: 0, x: 0, y: 0, scale: 0.4 }}
                animate={{
                  opacity: [0, 1, 0],
                  x: Math.cos(angle) * dist,
                  y: Math.sin(angle) * dist,
                  scale: [0.4, 1, 0.2],
                }}
                transition={{ duration: 0.7, ease: 'easeOut', delay: 0.05 }}
              >
                {CURRENCY_GLYPH}
              </motion.span>
            )
          })}
        </span>
      )}
    </span>
  )
}
