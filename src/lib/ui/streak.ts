/** A streak is "active" (flame turns blue) once it reaches at least one day. */
export function streakIsActive(streak: number): boolean {
  return streak > 0
}
