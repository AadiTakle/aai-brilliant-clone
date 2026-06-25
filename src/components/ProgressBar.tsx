interface ProgressBarProps {
  completed: number
  total: number
  label?: string
}

export function ProgressBar({ completed, total, label }: ProgressBarProps) {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0
  return (
    <div className="progress-bar" aria-label={label ?? 'Lesson progress'}>
      <div
        className="progress-bar-track"
        role="progressbar"
        aria-valuenow={completed}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuetext={`${completed} of ${total} steps`}
      >
        <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
      </div>
      <span className="progress-bar-text">
        {completed} / {total}
      </span>
    </div>
  )
}
