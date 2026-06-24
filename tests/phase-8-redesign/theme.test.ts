import { describe, it, expect } from 'vitest'
import { resolveInitialTheme } from '../../src/theme/theme'
import { streakIsActive } from '../../src/lib/ui/streak'
import { lessonCtaLabel } from '../../src/lib/ui/lessonCta'

// [Phase 8] theme default + persistence resolution
describe('[Phase 8] resolveInitialTheme', () => {
  it('uses a stored choice over the OS preference', () => {
    expect(resolveInitialTheme('dark', false)).toBe('dark')
    expect(resolveInitialTheme('light', true)).toBe('light')
  })

  it('falls back to the OS preference when nothing is stored', () => {
    expect(resolveInitialTheme(null, true)).toBe('dark')
    expect(resolveInitialTheme(null, false)).toBe('light')
  })

  it('ignores invalid stored values', () => {
    expect(resolveInitialTheme('purple', true)).toBe('dark')
  })
})

describe('[Phase 8] streakIsActive', () => {
  it('is false at zero and true once a streak exists', () => {
    expect(streakIsActive(0)).toBe(false)
    expect(streakIsActive(1)).toBe(true)
    expect(streakIsActive(9)).toBe(true)
  })
})

describe('[Phase 8] lessonCtaLabel', () => {
  it('shows Review when complete', () => {
    expect(lessonCtaLabel(true, true)).toBe('Review lesson')
  })
  it('shows Continue when started but not complete', () => {
    expect(lessonCtaLabel(false, true)).toBe('Continue lesson')
  })
  it('shows Start when not started', () => {
    expect(lessonCtaLabel(false, false)).toBe('Start lesson')
  })
})
