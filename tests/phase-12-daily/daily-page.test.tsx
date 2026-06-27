import { describe, it, expect, beforeEach, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DailyChallengePage } from '../../src/pages/DailyChallengePage'
import { makeAuthValue, makeUser, renderWithAuth } from '../helpers/renderWithAuth'
import * as store from '../../src/lib/daily/store'
import * as commit from '../../src/lib/daily/commit'

// Server-owned reads are mocked; the page is pure UI over them.
vi.mock('../../src/lib/daily/store', () => ({
  loadConcepts: vi.fn(),
  loadTodayChallenge: vi.fn(),
}))
vi.mock('../../src/lib/daily/commit', () => ({
  commitDailyChallenge: vi.fn(),
}))

// Pin the question pool to a single, known recall item for `print` so the run is
// deterministic; keep the real shuffle/sampleN.
vi.mock('../../src/lib/checkpoints/itemBank', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/lib/checkpoints/itemBank')>()
  return {
    ...actual,
    recallItemsForConcept: (concept: string) =>
      concept === 'print'
        ? [
            {
              prompt: 'What does print do?',
              choices: ['Shows text', 'Adds numbers'],
              answerIndex: 0,
              concept: 'print',
            },
          ]
        : [],
  }
})

function renderPage() {
  return renderWithAuth(<DailyChallengePage />, {
    authValue: makeAuthValue({ user: makeUser('Ada') }),
    initialEntries: ['/daily'],
  })
}

describe('[Phase 12] DailyChallengePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(store.loadConcepts).mockResolvedValue({})
    vi.mocked(store.loadTodayChallenge).mockResolvedValue(null)
    vi.mocked(commit.commitDailyChallenge).mockResolvedValue({ awarded: true, sparksDelta: 50, totalPoints: 50 })
  })

  it('renders the first due question', async () => {
    renderPage()
    expect(await screen.findByText('What does print do?')).toBeInTheDocument()
    expect(commit.commitDailyChallenge).not.toHaveBeenCalled()
  })

  it('shows the "already done today" summary without re-committing', async () => {
    vi.mocked(store.loadTodayChallenge).mockResolvedValue({ correctCount: 4, sparks: 200 })
    renderPage()
    expect(await screen.findByText(/done for today/i)).toBeInTheDocument()
    expect(commit.commitDailyChallenge).not.toHaveBeenCalled()
  })

  it('commits the day’s results after a normal run', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByLabelText('Shows text'))
    await user.click(screen.getByRole('button', { name: /check/i }))
    await user.click(screen.getByRole('button', { name: /finish/i }))

    expect(await screen.findByText(/daily challenge complete/i)).toBeInTheDocument()
    expect(commit.commitDailyChallenge).toHaveBeenCalledTimes(1)
    const [day, results] = vi.mocked(commit.commitDailyChallenge).mock.calls[0]
    expect(typeof day).toBe('string')
    expect(results).toHaveLength(1)
    expect(results[0]).toMatchObject({ concept: 'print', correct: true })
  })
})
