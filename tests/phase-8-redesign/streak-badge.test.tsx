import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { StreakBadge } from '../../src/components/StreakBadge'

// [Phase 8] streak flame color state
describe('[Phase 8] StreakBadge', () => {
  it('is cold (not active) at zero', () => {
    const { container } = render(<StreakBadge streak={0} />)
    const badge = container.querySelector('.streak-badge')
    expect(badge).not.toBeNull()
    expect(badge?.classList.contains('is-active')).toBe(false)
    expect(badge?.textContent).toContain('0')
  })

  it('is active (blue) with a positive streak and shows the count', () => {
    const { container } = render(<StreakBadge streak={4} />)
    const badge = container.querySelector('.streak-badge')
    expect(badge?.classList.contains('is-active')).toBe(true)
    expect(badge?.textContent).toContain('4')
  })
})
