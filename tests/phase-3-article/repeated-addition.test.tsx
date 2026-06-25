import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { RepeatedAddition } from '../../src/problem-types/article/widgets/RepeatedAddition'

function mockMatchMedia(reduce: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: reduce && query.includes('prefers-reduced-motion'),
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    onchange: null,
    dispatchEvent: vi.fn(),
  }))
}

// [L6] The intro tedium demo: the learner must DRAG "+3" blocks into the
// equation until the running total reaches the target (3+3+3+3+3 = 15). Doing it
// by hand is tedious — which sets up the need for loops.
describe('[L6] RepeatedAddition — drag +N blocks to reach the target total', () => {
  it('drops +3 blocks, grows the equation/total, and completes only at 15', () => {
    mockMatchMedia(false)
    const onComplete = vi.fn()
    render(<RepeatedAddition config={{ value: 3, target: 5 }} onComplete={onComplete} />)

    const zone = screen.getByLabelText('equation')
    const chip = screen.getByLabelText('drag + 3')

    // Starts empty (total 0).
    expect(zone).toHaveTextContent('0')

    // Four drops → 12, not done yet.
    for (let n = 0; n < 4; n++) {
      fireEvent.dragStart(chip)
      fireEvent.drop(zone)
    }
    expect(zone.textContent).toContain('12')
    expect(onComplete).not.toHaveBeenCalled()

    // Fifth drop reaches 15 and completes.
    fireEvent.dragStart(chip)
    fireEvent.drop(zone)
    expect(zone.textContent).toContain('15')
    expect(onComplete).toHaveBeenCalledTimes(1)
  })

  it('click is an accessible fallback that also adds a block', () => {
    mockMatchMedia(false)
    const onComplete = vi.fn()
    render(<RepeatedAddition config={{ value: 3, target: 2 }} onComplete={onComplete} />)
    const chip = screen.getByLabelText('drag + 3')
    fireEvent.click(chip)
    expect(onComplete).not.toHaveBeenCalled()
    fireEvent.click(chip)
    expect(onComplete).toHaveBeenCalledTimes(1)
    expect(screen.getByLabelText('equation').textContent).toContain('6')
  })

  it('respects prefers-reduced-motion', () => {
    mockMatchMedia(true)
    const { container } = render(<RepeatedAddition config={{ value: 3, target: 5 }} />)
    const root = container.querySelector('[data-widget="repeated_addition"]')!
    expect(root.getAttribute('data-motion')).toBe('reduced')
  })
})
