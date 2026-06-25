import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ArticleStep } from '../../src/problem-types/article/ArticleStep'
import { getStep } from '../../src/content/loader'

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

// [Phase 3] Brilliant-style panel progression: reveal one panel at a time,
// unlock Continue after each activity, complete after the last panel.
// L6's rebuilt intro has two parts: a drag-to-15 tedium demo, then a for-loop
// step-through (program_stepper in loop mode) as the final panel.
describe('[Phase 3] article panel progression', () => {
  it('gates Continue per panel and completes after the final activity', async () => {
    mockMatchMedia(false)
    const user = userEvent.setup()
    const onComplete = vi.fn()

    const loc = getStep('l6-over-and-over-again', 0)
    expect(loc?.step.type).toBe('article')
    render(<ArticleStep step={loc!.step} onComplete={onComplete} />)

    // Only the first panel is visible; later activities aren't in the DOM yet.
    expect(screen.queryByRole('button', { name: /^step$/i })).not.toBeInTheDocument()

    // Panel 1: Continue is disabled until the drag-to-15 demo completes.
    const continueBtn = screen.getByRole('button', { name: /continue/i })
    expect(continueBtn).toBeDisabled()

    const chip = screen.getByLabelText('drag + 3')
    for (let i = 0; i < 5; i++) {
      fireEvent.dragStart(chip)
      fireEvent.drop(screen.getByLabelText('equation'))
    }
    expect(continueBtn).toBeEnabled()
    expect(onComplete).not.toHaveBeenCalled()

    // Advance to panel 2 (the for-loop step-through) — the final panel.
    await user.click(continueBtn)
    expect(screen.queryByRole('button', { name: /continue/i })).not.toBeInTheDocument()

    const stepBtn = () => screen.getByRole('button', { name: /^step$/i }) as HTMLButtonElement
    for (let i = 0; i < 40 && !stepBtn().disabled; i++) {
      await user.click(stepBtn())
    }
    expect(onComplete).toHaveBeenCalled()
  })

  it('reveals the whole article up front when the learner already completed it (no re-gating)', () => {
    mockMatchMedia(false)
    const loc = getStep('l6-over-and-over-again', 0)
    expect(loc?.step.type).toBe('article')
    if (loc?.step.type !== 'article') throw new Error('not article')
    const panelCount = loc.step.config.panels.length
    expect(panelCount).toBeGreaterThan(1)

    render(<ArticleStep step={loc.step} onComplete={vi.fn()} initiallyComplete />)

    // Every panel is rendered immediately (each has a data-panel marker)...
    expect(document.querySelectorAll('[data-panel]')).toHaveLength(panelCount)
    // ...including the LAST panel's activity (the for-loop step-through), without
    // having to complete the earlier panels first.
    expect(screen.getByRole('button', { name: /^step$/i })).toBeInTheDocument()
    // And there is no Continue gate, since the whole thing is already open.
    expect(screen.queryByRole('button', { name: /continue/i })).not.toBeInTheDocument()
  })

  it('reveals the whole article if completion is confirmed after mount (async progress load)', () => {
    mockMatchMedia(false)
    const loc = getStep('l6-over-and-over-again', 0)
    if (loc?.step.type !== 'article') throw new Error('not article')
    const panelCount = loc.step.config.panels.length

    // First render as not-yet-complete (progress still loading)...
    const { rerender } = render(
      <ArticleStep step={loc.step} onComplete={vi.fn()} initiallyComplete={false} />,
    )
    expect(document.querySelectorAll('[data-panel]')).toHaveLength(1)

    // ...then progress loads and says it was already completed.
    rerender(<ArticleStep step={loc.step} onComplete={vi.fn()} initiallyComplete />)
    expect(document.querySelectorAll('[data-panel]')).toHaveLength(panelCount)
    expect(screen.queryByRole('button', { name: /continue/i })).not.toBeInTheDocument()
  })
})
