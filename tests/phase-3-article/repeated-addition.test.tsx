import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RepeatedAddition } from '../../src/problem-types/article/widgets/RepeatedAddition'

// [Phase 3] Repeated-addition hook widget
describe('[Phase 3] RepeatedAddition', () => {
  it('grows the sum and completes when the target count is reached', async () => {
    const user = userEvent.setup()
    const onComplete = vi.fn()
    render(<RepeatedAddition config={{ value: 3, target: 3 }} onComplete={onComplete} />)

    const addButton = screen.getByRole('button', { name: /\+ 3/ })
    await user.click(addButton)
    expect(onComplete).not.toHaveBeenCalled()
    await user.click(addButton)
    await user.click(addButton)

    expect(onComplete).toHaveBeenCalledTimes(1)
    // 3 + 3 + 3 = 9
    expect(screen.getByText('9')).toBeInTheDocument()
    expect(addButton).toBeDisabled()
  })
})
