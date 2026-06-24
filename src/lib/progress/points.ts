// Linear points decay (Phase 6).
//
// awarded = max(minPoints, basePoints − wrongAttempts × decrement)
// where decrement is sized so that 5 wrong attempts reaches minPoints.

const ATTEMPTS_TO_FLOOR = 5

export function computeDecrement(basePoints: number, minPoints: number): number {
  return (basePoints - minPoints) / ATTEMPTS_TO_FLOOR
}

export function computeAwardedPoints(
  basePoints: number,
  minPoints: number,
  wrongAttempts: number,
): number {
  const decrement = computeDecrement(basePoints, minPoints)
  const raw = basePoints - wrongAttempts * decrement
  return Math.max(minPoints, Math.round(raw))
}
