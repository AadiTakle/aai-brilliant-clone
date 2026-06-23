import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ArticleStep } from '../../src/problem-types/article/ArticleStep'
import { getStep } from '../../src/content/loader'

// [Phase 3] Brilliant-style panel progression: reveal one panel at a time,
// unlock Continue after each activity, complete after the last panel.
describe('[Phase 3] article panel progression', () => {
  it('gates Continue per panel and completes after the final activity', async () => {
    const user = userEvent.setup()
    const onComplete = vi.fn()

    const loc = getStep('over-and-over-again', 0)
    expect(loc?.step.type).toBe('article')
    render(<ArticleStep step={loc!.step} onComplete={onComplete} />)

    // Only the first panel is visible; later activities aren't in the DOM yet.
    expect(screen.queryByRole('button', { name: /step/i })).not.toBeInTheDocument()

    // Panel 1: Continue is disabled until repeated-addition completes.
    const continueBtn = screen.getByRole('button', { name: /continue/i })
    expect(continueBtn).toBeDisabled()

    const addButton = screen.getByRole('button', { name: /\+ 3/ })
    for (let i = 0; i < 5; i++) await user.click(addButton)
    expect(continueBtn).toBeEnabled()
    expect(onComplete).not.toHaveBeenCalled()

    // Advance to panel 2 (loop visualizer).
    await user.click(continueBtn)
    const stepButton = screen.getByRole('button', { name: /step/i })
    for (let i = 0; i < 5; i++) await user.click(stepButton)

    // Advance to the final panel (checkpoint) — no Continue button there.
    await user.click(screen.getByRole('button', { name: /continue/i }))
    expect(screen.queryByRole('button', { name: /continue/i })).not.toBeInTheDocument()
    expect(onComplete).not.toHaveBeenCalled()

    await user.click(screen.getByLabelText('5 times'))
    await user.click(screen.getByRole('button', { name: /check/i }))
    expect(onComplete).toHaveBeenCalled()
  })
})
