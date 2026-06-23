import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Checkpoint } from '../../src/problem-types/article/Checkpoint'
import type { CheckpointBlock } from '../../src/problem-types/article/schema'

const block: CheckpointBlock = {
  kind: 'checkpoint',
  prompt: 'How many times does range(5) run?',
  choices: ['Once', '4 times', '5 times'],
  answerIndex: 2,
  feedback: { correct: 'Exactly right!', incorrect: 'Count again.' },
}

// [Phase 3] Checkpoint grading with config-driven feedback
describe('[Phase 3] Checkpoint', () => {
  it('shows incorrect feedback and does not complete on a wrong answer', async () => {
    const user = userEvent.setup()
    const onComplete = vi.fn()
    render(<Checkpoint block={block} onComplete={onComplete} />)

    await user.click(screen.getByLabelText('4 times'))
    await user.click(screen.getByRole('button', { name: /check/i }))

    expect(screen.getByText('Count again.')).toBeInTheDocument()
    expect(onComplete).not.toHaveBeenCalled()
  })

  it('shows correct feedback and completes on the right answer', async () => {
    const user = userEvent.setup()
    const onComplete = vi.fn()
    render(<Checkpoint block={block} onComplete={onComplete} />)

    await user.click(screen.getByLabelText('5 times'))
    await user.click(screen.getByRole('button', { name: /check/i }))

    expect(screen.getByText('Exactly right!')).toBeInTheDocument()
    expect(onComplete).toHaveBeenCalledTimes(1)
  })
})
