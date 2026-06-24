import { describe, it, expect, afterAll } from 'vitest'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { createEmulatorApp, uniqueEmail } from '../helpers/emulatorApp'
import { createUserProfile, getUserProfile } from '../../src/lib/users'
import {
  commitStepRewards,
  loadLessonProgress,
  progressDocId,
  saveLessonProgress,
} from '../../src/lib/progress/store'
import { applyResult, emptyProgress } from '../../src/lib/progress/model'

// [Phase 6] Persistence round-trip against the Firestore emulator.
// Runs under vitest.emulator.config.ts (`npm run test:emulator`).
const env = createEmulatorApp('phase6-progress')

afterAll(() => env.destroy())

describe('[Phase 6] progress persistence (emulator)', () => {
  it('survives a reload and updates lifetime aggregates', async () => {
    const cred = await createUserWithEmailAndPassword(env.auth, uniqueEmail(), 'password123')
    const uid = cred.user.uid
    await createUserProfile(env.db, uid, { displayName: 'Ada', email: 'parent@example.com' })

    // Complete a graded step first-try → full points.
    const { progress, pointsDelta } = applyResult(emptyProgress(1), {
      stepId: 'q1',
      graded: true,
      correct: true,
      basePoints: 100,
      minPoints: 20,
      now: new Date().toISOString(),
    })
    await saveLessonProgress(env.db, uid, 'demo', progress)
    await commitStepRewards(env.db, uid, {
      pointsDelta,
      today: '2026-06-23',
      lessonId: 'demo',
      lessonComplete: true,
    })

    const reloaded = await loadLessonProgress(env.db, uid, 'demo')
    expect(reloaded?.steps.q1.status).toBe('completed')
    expect(reloaded?.steps.q1.pointsAwarded).toBe(100)

    const profile = await getUserProfile(env.db, uid)
    expect(profile?.totalPoints).toBe(100)
    expect(profile?.currentStreak).toBe(1)
    expect(profile?.completedLessons).toContain('demo')
  })

  it('builds a deterministic progress doc id', () => {
    expect(progressDocId('abc', 'demo')).toBe('abc_demo')
  })
})
