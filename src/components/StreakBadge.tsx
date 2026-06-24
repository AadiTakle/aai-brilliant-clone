// Daily streak shown as a flame + day count. At 0 the flame is "cold" (dark);
// once the learner has a streak it turns blue.

import { streakIsActive } from '../lib/ui/streak'

export function StreakBadge({ streak, className }: { streak: number; className?: string }) {
  const active = streakIsActive(streak)
  return (
    <span
      className={`streak-badge${active ? ' is-active' : ''}${className ? ` ${className}` : ''}`}
      title={`${streak}-day streak`}
    >
      <svg
        className="streak-flame"
        viewBox="0 0 24 24"
        width="18"
        height="18"
        aria-hidden="true"
        fill="currentColor"
      >
        <path d="M12 2S5 8 5 14a7 7 0 0 0 14 0c0-2-1-4-2-5 0 2-1.5 3-3 3 1-3-1-7-2-10z" />
      </svg>
      <span className="streak-count">{streak}</span>
    </span>
  )
}
