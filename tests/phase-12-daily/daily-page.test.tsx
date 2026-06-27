import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DailyChallengePage } from '../../src/pages/DailyChallengePage'
import { makeAuthValue, makeUser, renderWithAuth } from '../helpers/renderWithAuth'
import type { UserProfile } from '../../src/lib/users'
import * as store from '../../src/lib/daily/store'
import * as commit from '../../src/lib/daily/commit'
import { isoDay } from '../../src/lib/progress/streak'

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

// The Daily Challenge only draws concepts the learner has been taught, so a
// profile that has cleared L1 (which teaches `print`) keeps the deterministic
// `print`-only run below working.
function makeProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    displayName: 'Ada',
    email: 'ada@example.com',
    totalPoints: 0,
    currentStreak: 0,
    lastActiveDate: null,
    completedLessons: ['l1-talking-to-the-computer'],
    masteredLessons: [],
    passedCheckpoints: [],
    activeDays: [],
    ...overrides,
  }
}

function renderPage(profile: UserProfile = makeProfile()) {
  return renderWithAuth(<DailyChallengePage />, {
    authValue: makeAuthValue({ user: makeUser('Ada'), profile }),
    initialEntries: ['/daily'],
  })
}

describe('[Phase 12] DailyChallengePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Fresh in-memory localStorage per test (the jsdom stub here lacks a usable
    // Storage), so the device-level same-day lock is exercised in isolation.
    const mem = new Map<string, string>()
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => (mem.has(k) ? (mem.get(k) as string) : null),
      setItem: (k: string, v: string) => void mem.set(k, String(v)),
      removeItem: (k: string) => void mem.delete(k),
      clear: () => mem.clear(),
      key: (i: number) => [...mem.keys()][i] ?? null,
      get length() {
        return mem.size
      },
    })
    vi.mocked(store.loadConcepts).mockResolvedValue({})
    vi.mocked(store.loadTodayChallenge).mockResolvedValue(null)
    vi.mocked(commit.commitDailyChallenge).mockResolvedValue({ awarded: true, sparksDelta: 50, totalPoints: 50 })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders the first due question', async () => {
    renderPage()
    expect(await screen.findByText('What does print do?')).toBeInTheDocument()
    expect(commit.commitDailyChallenge).not.toHaveBeenCalled()
  })

  it('shows a friendly empty state when the learner has not learned anything yet', async () => {
    renderPage(makeProfile({ completedLessons: [], masteredLessons: [] }))
    expect(await screen.findByText(/complete a lesson first/i)).toBeInTheDocument()
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

  it('locks replay on this device once finished, even without a server marker', async () => {
    localStorage.setItem(`pyxel:dailyDone:test-uid:${isoDay()}`, '1')
    renderPage()
    expect(await screen.findByText(/done for today/i)).toBeInTheDocument()
    expect(screen.queryByText('What does print do?')).not.toBeInTheDocument()
    expect(commit.commitDailyChallenge).not.toHaveBeenCalled()
  })

  it('sets the same-day device lock after finishing, blocking replay today', async () => {
    const user = userEvent.setup()
    const { unmount } = renderPage()
    await user.click(await screen.findByLabelText('Shows text'))
    await user.click(screen.getByRole('button', { name: /check/i }))
    await user.click(screen.getByRole('button', { name: /finish/i }))
    expect(await screen.findByText(/daily challenge complete/i)).toBeInTheDocument()

    expect(localStorage.getItem(`pyxel:dailyDone:test-uid:${isoDay()}`)).toBe('1')

    // A fresh visit today now shows "done" even though the server marker is null.
    unmount()
    renderPage()
    expect(await screen.findByText(/done for today/i)).toBeInTheDocument()
  })
})
