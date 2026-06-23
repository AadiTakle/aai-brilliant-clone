import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LoopVisualizer } from '../../src/problem-types/article/widgets/LoopVisualizer'

// [Phase 3] loop_visualizer widget
describe('[Phase 3] LoopVisualizer', () => {
  it('completes once the repeat count reaches the target iterations', async () => {
    const user = userEvent.setup()
    const onComplete = vi.fn()
    render(<LoopVisualizer config={{ iterations: 3, action: 'print("hi")' }} onComplete={onComplete} />)

    const stepButton = screen.getByRole('button', { name: /step/i })
    await user.click(stepButton)
    await user.click(stepButton)
    expect(onComplete).not.toHaveBeenCalled()
    await user.click(stepButton)

    expect(onComplete).toHaveBeenCalledTimes(1)
    expect(screen.getByLabelText('loop output').children).toHaveLength(3)
    expect(stepButton).toBeDisabled()
  })
})
