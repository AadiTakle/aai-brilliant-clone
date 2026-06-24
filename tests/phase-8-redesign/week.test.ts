import { describe, it, expect } from 'vitest'
import { weekActivity } from '../../src/lib/progress/week'

// [Phase 8] weekly activity strip for the streak modal
describe('[Phase 8] weekActivity', () => {
  // Tuesday, June 23, 2026 (local). Week starts Sunday June 21.
  const today = new Date(2026, 5, 23)

  it('returns the seven days of the current (Sunday-start) week', () => {
    const days = weekActivity([], today)
    expect(days).toHaveLength(7)
    expect(days[0].iso).toBe('2026-06-21')
    expect(days[0].label).toBe('S')
    expect(days[6].iso).toBe('2026-06-27')
  })

  it('marks days on which a lesson was completed', () => {
    const days = weekActivity(['2026-06-22', '2026-06-23'], today)
    expect(days[1].done).toBe(true) // Mon
    expect(days[2].done).toBe(true) // Tue
    expect(days[3].done).toBe(false) // Wed
  })

  it('flags today', () => {
    const days = weekActivity([], today)
    expect(days[2].isToday).toBe(true)
    expect(days[0].isToday).toBe(false)
  })
})
