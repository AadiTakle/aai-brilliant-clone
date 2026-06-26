import { describe, it, expect } from 'vitest'
import { rollingWeekActivity, weekActivity } from '../../src/lib/progress/week'

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

  it('rollingWeekActivity shows the last 7 days ending today', () => {
    const days = rollingWeekActivity([], today)
    expect(days).toHaveLength(7)
    expect(days[6].iso).toBe('2026-06-23')
    expect(days[6].isToday).toBe(true)
    expect(days[0].iso).toBe('2026-06-17')
  })

  it('rollingWeekActivity marks streak display days', () => {
    const fri = new Date(2026, 5, 26)
    const days = rollingWeekActivity(['2026-06-24', '2026-06-25', '2026-06-26'], fri)
    expect(days.filter((d) => d.done)).toHaveLength(3)
  })
})
