import { useMemo, useState } from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AuthContext, type AuthContextValue } from '../../src/auth/context'
import { listLessons } from '../../src/content/loader'
import { getCheckpoint } from '../../src/content/checkpoints'
import type { CheckpointResult } from '../../src/lib/checkpoints/scoring'
import type { UserProfile } from '../../src/lib/users'
import type { LessonProgress } from '../../src/lib/progress/model'

// useCourseProgress reads each lesson's progress from Firestore; mock it away so
// "cleared" state is driven entirely by the profile's masteredLessons (the prior
// three lessons), keeping the gate's only remaining condition the checkpoint pass.
const loadLessonProgress =
  vi.fn<(db: unknown, uid: string, lessonId: string) => Promise<LessonProgress | null>>()
vi.mock('../../src/lib/progress/store', () => ({
  loadLessonProgress: (...args: [unknown, string, string]) => loadLessonProgress(...args),
}))

// Stand in for the real Cloud Function callable: mutate a server-side "backing"
// profile (adding the id to passedCheckpoints) exactly like
// commitCheckpointCompletion does, so refreshProfile below can re-read it.
const commitCheckpoint = vi.fn<(id: string, passed: boolean) => Promise<unknown>>()
vi.mock('../../src/lib/checkpoints/commit', () => ({
  commitCheckpoint: (...args: [string, boolean]) => commitCheckpoint(...args),
}))

const { CheckpointResults } = await import('../../src/pages/checkpoint/CheckpointResults')
const { useCourseProgress } = await import('../../src/lib/progress/useCourseProgress')

const lessons = listLessons()
const GATE = 'cp-foundations'
const GATED_LESSON = 'l4-true-or-false'
const PRIOR = ['l1-talking-to-the-computer', 'l2-boxes-that-remember', 'l3-doing-the-math']
const gatedIndex = lessons.findIndex((l) => l.id === GATED_LESSON)
const spec = getCheckpoint(GATE)
if (!spec) throw new Error('cp-foundations spec missing')

// A clean pass: enough to flip CheckpointResults into its award + refresh path.
const passResult: CheckpointResult = {
  totalAsked: 3,
  totalCorrect: 3,
  overall: 1,
  overallPassed: true,
  concepts: [{ concept: 'print', asked: 3, correct: 3, required: 2, passed: true }],
  perConceptPassed: true,
  passed: true,
}

function makeProfile(passedCheckpoints: string[]): UserProfile {
  return {
    displayName: 'Ada',
    email: 'ada@example.com',
    totalPoints: 0,
    currentStreak: 0,
    lastActiveDate: null,
    completedLessons: [],
    masteredLessons: [...PRIOR],
    passedCheckpoints,
    activeDays: [],
  }
}

// A live mini AuthProvider: the cached profile lives in React state and
// refreshProfile re-reads the mutable `backing` ref — mirroring getUserProfile
// re-reading the Firestore user doc the Cloud Function just wrote.
function Harness({ backing }: { backing: { current: UserProfile } }) {
  // Start WITHOUT the gate passed so the lesson begins locked.
  const [profile, setProfile] = useState<UserProfile>(() => makeProfile([]))
  const value = useMemo<AuthContextValue>(
    () => ({
      user: { uid: 'u1' } as never,
      profile,
      loading: false,
      signUp: vi.fn(),
      signIn: vi.fn(),
      signInWithGoogle: vi.fn(),
      logOut: vi.fn(),
      refreshProfile: async () => {
        setProfile({ ...backing.current })
      },
    }),
    [profile, backing],
  )
  return (
    <AuthContext.Provider value={value}>
      <CheckpointResults spec={spec!} result={passResult} onRetry={() => {}} />
      <GateProbe />
    </AuthContext.Provider>
  )
}

function GateProbe() {
  const { lessons: states } = useCourseProgress()
  return <div data-testid="l4-unlocked">{String(states[gatedIndex]?.unlocked ?? false)}</div>
}

function renderHarness(backing: { current: UserProfile }) {
  return render(
    <MemoryRouter>
      <Harness backing={backing} />
    </MemoryRouter>,
  )
}

describe('[Phase 11] passing a checkpoint unlocks the next lesson', () => {
  beforeEach(() => {
    loadLessonProgress.mockReset()
    loadLessonProgress.mockResolvedValue(null)
    commitCheckpoint.mockReset()
  })

  it('unlocks the gated lesson after the pass commits and the profile refreshes', async () => {
    const backing = { current: makeProfile([]) }
    commitCheckpoint.mockImplementation(async (id, passed) => {
      // The server records the pass in passedCheckpoints, just like the callable.
      if (passed) {
        backing.current = {
          ...backing.current,
          passedCheckpoints: [...backing.current.passedCheckpoints, id],
        }
      }
      return { awarded: true, passed: true, sparksDelta: 500, totalPoints: 500 }
    })

    renderHarness(backing)

    // The next lesson starts locked behind the unpassed checkpoint...
    expect(screen.getByTestId('l4-unlocked')).toHaveTextContent('false')
    // ...and opens once the pass is committed and the cached profile is refreshed.
    await waitFor(() => expect(screen.getByTestId('l4-unlocked')).toHaveTextContent('true'))
    expect(commitCheckpoint).toHaveBeenCalledWith(GATE, true)
  })

  it('still unlocks when the commit response is lost but the pass already landed', async () => {
    // The write reached the server (passedCheckpoints already has the gate) but the
    // callable response was dropped, so commitCheckpoint rejects. The refresh in the
    // `finally` must still run so the gate opens without a hard reload.
    const backing = { current: makeProfile([GATE]) }
    commitCheckpoint.mockRejectedValue(new Error('response lost in transit'))

    renderHarness(backing)

    expect(screen.getByTestId('l4-unlocked')).toHaveTextContent('false')
    await waitFor(() => expect(screen.getByTestId('l4-unlocked')).toHaveTextContent('true'))
  })
})
