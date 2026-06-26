import { describe, it, expect, afterAll } from 'vitest'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { doc, setDoc } from 'firebase/firestore'
import { createEmulatorApp, uniqueEmail } from '../helpers/emulatorApp'
import { createUserProfile, getUserProfile } from '../../src/lib/users'
import { loadLessonProgress, progressDocId, saveLessonProgress } from '../../src/lib/progress/store'
import { applyResult, emptyProgress } from '../../src/lib/progress/model'

// [Phase 6] Persistence round-trip against the Firestore emulator.
// Runs under vitest.emulator.config.ts (`npm run test:emulator`).
const env = createEmulatorApp('phase6-progress')

afterAll(() => env.destroy())

describe('[Phase 6] progress persistence (emulator)', () => {
  it('round-trips gameplay/resume state for the owner', async () => {
    const cred = await createUserWithEmailAndPassword(env.auth, uniqueEmail(), 'password123')
    const uid = cred.user.uid
    await createUserProfile(env.db, uid, { displayName: 'Ada', email: 'parent@example.com' })

    const { progress } = applyResult(emptyProgress(1), {
      stepId: 'q1',
      graded: true,
      correct: true,
      basePoints: 100,
      minPoints: 20,
      now: new Date().toISOString(),
    })
    await saveLessonProgress(env.db, uid, 'demo', progress)

    const reloaded = await loadLessonProgress(env.db, uid, 'demo')
    expect(reloaded?.steps.q1.status).toBe('completed')
    expect(reloaded?.steps.q1.pointsAwarded).toBe(100)
  })

  it('creates a zeroed profile and refuses client-side balance forgery', async () => {
    const cred = await createUserWithEmailAndPassword(env.auth, uniqueEmail(), 'password123')
    const uid = cred.user.uid
    await createUserProfile(env.db, uid, { displayName: 'Ada', email: 'parent@example.com' })

    const profile = await getUserProfile(env.db, uid)
    expect(profile?.totalPoints).toBe(0)

    // The Spark balance is server-only: a direct client write must be rejected by
    // the rules (totalPoints changes only via the recordStepCompletion function).
    await expect(
      setDoc(doc(env.db, 'users', uid), { totalPoints: 999999 }, { merge: true }),
    ).rejects.toThrow()

    const after = await getUserProfile(env.db, uid)
    expect(after?.totalPoints).toBe(0)
  })

  it('builds a deterministic progress doc id', () => {
    expect(progressDocId('abc', 'demo')).toBe('abc_demo')
  })
})
