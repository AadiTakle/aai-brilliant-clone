// Pure helpers for the points/currency count-up animation.

export function easeOutCubic(t: number): number {
  const c = Math.min(1, Math.max(0, t))
  return 1 - Math.pow(1 - c, 3)
}

/** Interpolated, rounded value at `progress` (0..1) between `from` and `to`. */
export function countUpValue(from: number, to: number, progress: number): number {
  return Math.round(from + (to - from) * easeOutCubic(progress))
}
