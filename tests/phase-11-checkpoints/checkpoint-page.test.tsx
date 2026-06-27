import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// A fixed two-item set (one `print`, one `variable`) makes the run deterministic:
// clicking the right/wrong choices decides pass/fail. The commit wrapper is mocked
// so we can assert the award is (or isn't) fired without touching Firebase.
const { FIXED_ITEMS, commitCheckpointMock } = vi.hoisted(() => ({
  FIXED_ITEMS: [
    {
      concept: 'print',
      question: {
        concept: 'print',
        prompt: 'What does print() do?',
        choices: ['Shows text', 'Adds numbers'],
        answerIndex: 0,
      },
    },
    {
      concept: 'variable',
      question: {
        concept: 'variable',
        prompt: 'What is a variable?',
        choices: ['A loop', 'A named box'],
        answerIndex: 1,
      },
    },
  ],
  commitCheckpointMock: vi.fn(),
}))

vi.mock('../../src/lib/checkpoints/itemBank', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/lib/checkpoints/itemBank')>()
  return { ...actual, buildCheckpointItems: () => FIXED_ITEMS }
})

vi.mock('../../src/lib/checkpoints/commit', () => ({
  commitCheckpoint: commitCheckpointMock,
}))

const { AppRoutes } = await import('../../src/app/AppRoutes')
const { makeAuthValue, makeUser, renderWithAuth } = await import('../helpers/renderWithAuth')

function renderCheckpoint() {
  return renderWithAuth(<AppRoutes />, {
    authValue: makeAuthValue({ user: makeUser('Ada') }),
    initialEntries: ['/checkpoint/cp-foundations'],
  })
}

// Select a choice then commit it via the (answer-once) Check button.
async function answer(user: ReturnType<typeof userEvent.setup>, labelText: string) {
  await user.click(screen.getByLabelText(labelText))
  await user.click(screen.getByRole('button', { name: /^check$/i }))
}

describe('[Phase 11] CheckpointPage', () => {
  beforeEach(() => {
    commitCheckpointMock.mockReset()
    commitCheckpointMock.mockResolvedValue({
      awarded: true,
      passed: true,
      sparksDelta: 500,
      totalPoints: 500,
    })
  })

  it('runs answer-once and PASSES when every answer is correct, awarding exactly once', async () => {
    const user = userEvent.setup()
    renderCheckpoint()

    await user.click(screen.getByRole('button', { name: /start checkpoint/i }))

    // Answer-once: Next is locked until the current question is committed.
    expect(screen.getByRole('button', { name: /next question/i })).toBeDisabled()
    await answer(user, 'Shows text')
    expect(screen.getByRole('button', { name: /next question/i })).toBeEnabled()
    await user.click(screen.getByRole('button', { name: /next question/i }))

    await answer(user, 'A named box')
    await user.click(screen.getByRole('button', { name: /see results/i }))

    expect(screen.getByText('Passed')).toBeInTheDocument()
    await waitFor(() => expect(commitCheckpointMock).toHaveBeenCalledWith('cp-foundations', true))
    expect(commitCheckpointMock).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('link', { name: /continue/i })).toBeInTheDocument()
  })

  it('FAILS with a per-concept breakdown + Retry and never awards on wrong answers', async () => {
    const user = userEvent.setup()
    renderCheckpoint()

    await user.click(screen.getByRole('button', { name: /start checkpoint/i }))
    await answer(user, 'Adds numbers')
    await user.click(screen.getByRole('button', { name: /next question/i }))
    await answer(user, 'A loop')
    await user.click(screen.getByRole('button', { name: /see results/i }))

    expect(screen.getByText('Keep practicing')).toBeInTheDocument()
    expect(screen.getByRole('table')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /retry checkpoint/i })).toBeInTheDocument()
    expect(commitCheckpointMock).not.toHaveBeenCalled()
  })
})
