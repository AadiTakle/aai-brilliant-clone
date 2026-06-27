import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest'
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import { doc, getDoc, setDoc } from 'firebase/firestore'

// [Phase 1] Firestore security rules: users private, courses public-read, progress per-user
describe('[Phase 1] firestore.rules', () => {
  let testEnv: RulesTestEnvironment

  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: 'demo-rules-test',
      firestore: {
        rules: readFileSync(resolve(process.cwd(), 'firestore.rules'), 'utf8'),
        host: '127.0.0.1',
        port: 8080,
      },
    })
  })

  afterAll(async () => {
    await testEnv.cleanup()
  })

  beforeEach(async () => {
    await testEnv.clearFirestore()
  })

  const initialProfile = {
    displayName: 'Alice',
    email: 'alice@example.com',
    totalPoints: 0,
    currentStreak: 0,
    lastActiveDate: null,
    completedLessons: [] as string[],
    masteredLessons: [] as string[],
    passedCheckpoints: [] as string[],
    activeDays: [] as string[],
  }

  describe('users/{uid}', () => {
    it('lets the owner create a zeroed profile and read it', async () => {
      const alice = testEnv.authenticatedContext('alice').firestore()
      await assertSucceeds(setDoc(doc(alice, 'users/alice'), initialProfile))
      await assertSucceeds(getDoc(doc(alice, 'users/alice')))
    })

    it('forbids creating a profile pre-loaded with Sparks', async () => {
      const alice = testEnv.authenticatedContext('alice').firestore()
      await assertFails(setDoc(doc(alice, 'users/alice'), { ...initialProfile, totalPoints: 9999 }))
    })

    it('lets the owner edit profile fields but never the balance', async () => {
      await testEnv.withSecurityRulesDisabled(async (ctx) => {
        await setDoc(doc(ctx.firestore(), 'users/alice'), { ...initialProfile, totalPoints: 300 })
      })
      const alice = testEnv.authenticatedContext('alice').firestore()
      // Editing a profile field while leaving aggregates untouched is fine.
      await assertSucceeds(
        setDoc(doc(alice, 'users/alice'), { displayName: 'Alice 2' }, { merge: true }),
      )
      // Forging the balance is rejected — totalPoints is server-only.
      await assertFails(setDoc(doc(alice, 'users/alice'), { totalPoints: 99999 }, { merge: true }))
      // ...as is bumping the streak or completion history.
      await assertFails(setDoc(doc(alice, 'users/alice'), { currentStreak: 50 }, { merge: true }))
      // ...as is self-clearing a Mastery Checkpoint gate (passedCheckpoints is
      // server-only, written only by commitCheckpointCompletion).
      await assertFails(
        setDoc(doc(alice, 'users/alice'), { passedCheckpoints: ['cp-foundations'] }, { merge: true }),
      )
    })

    it('accepts a valid profile that carries the passedCheckpoints field', async () => {
      const alice = testEnv.authenticatedContext('alice').firestore()
      await assertSucceeds(setDoc(doc(alice, 'users/alice'), initialProfile))
    })

    it('forbids reading another user profile', async () => {
      await testEnv.withSecurityRulesDisabled(async (ctx) => {
        await setDoc(doc(ctx.firestore(), 'users/alice'), initialProfile)
      })
      const bob = testEnv.authenticatedContext('bob').firestore()
      await assertFails(getDoc(doc(bob, 'users/alice')))
    })

    it('forbids unauthenticated reads', async () => {
      const anon = testEnv.unauthenticatedContext().firestore()
      await assertFails(getDoc(doc(anon, 'users/alice')))
    })
  })

  describe('users/{uid}/aiLessons', () => {
    it('lets the owner read their custom lessons', async () => {
      await testEnv.withSecurityRulesDisabled(async (ctx) => {
        await setDoc(doc(ctx.firestore(), 'users/alice/aiLessons/x'), { title: 'T' })
      })
      const alice = testEnv.authenticatedContext('alice').firestore()
      await assertSucceeds(getDoc(doc(alice, 'users/alice/aiLessons/x')))
    })

    it('forbids client writes (saves go through the Cloud Function)', async () => {
      const alice = testEnv.authenticatedContext('alice').firestore()
      await assertFails(setDoc(doc(alice, 'users/alice/aiLessons/x'), { title: 'Free lesson' }))
    })
  })

  describe('users/{uid}/concepts', () => {
    it('lets the owner read their spaced-repetition concept records', async () => {
      await testEnv.withSecurityRulesDisabled(async (ctx) => {
        await setDoc(doc(ctx.firestore(), 'users/alice/concepts/loop'), { strength: 0.5 })
      })
      const alice = testEnv.authenticatedContext('alice').firestore()
      await assertSucceeds(getDoc(doc(alice, 'users/alice/concepts/loop')))
    })

    it('forbids client writes (strength is server-owned, written by the Cloud Function)', async () => {
      const alice = testEnv.authenticatedContext('alice').firestore()
      await assertFails(setDoc(doc(alice, 'users/alice/concepts/loop'), { strength: 1 }))
    })

    it("forbids reading another user's concepts", async () => {
      await testEnv.withSecurityRulesDisabled(async (ctx) => {
        await setDoc(doc(ctx.firestore(), 'users/alice/concepts/loop'), { strength: 0.5 })
      })
      const bob = testEnv.authenticatedContext('bob').firestore()
      await assertFails(getDoc(doc(bob, 'users/alice/concepts/loop')))
    })
  })

  describe('users/{uid}/daily', () => {
    it('lets the owner read their daily challenge markers', async () => {
      await testEnv.withSecurityRulesDisabled(async (ctx) => {
        await setDoc(doc(ctx.firestore(), 'users/alice/daily/2026-06-27'), { correctCount: 4, sparks: 200 })
      })
      const alice = testEnv.authenticatedContext('alice').firestore()
      await assertSucceeds(getDoc(doc(alice, 'users/alice/daily/2026-06-27')))
    })

    it('forbids client writes (the daily ledger is server-owned)', async () => {
      const alice = testEnv.authenticatedContext('alice').firestore()
      await assertFails(setDoc(doc(alice, 'users/alice/daily/2026-06-27'), { sparks: 9999 }))
    })
  })

  describe('rewards/{rewardId}', () => {
    it('is server-only — clients can neither read nor write the ledger', async () => {
      const alice = testEnv.authenticatedContext('alice').firestore()
      await assertFails(setDoc(doc(alice, 'rewards/alice_l1-talking-to-the-computer'), { awarded: {} }))
      await assertFails(getDoc(doc(alice, 'rewards/alice_l1-talking-to-the-computer')))
    })
  })

  describe('masteryRewards/{rewardId}', () => {
    it('is server-only — clients can neither read nor write the mastery ledger', async () => {
      const alice = testEnv.authenticatedContext('alice').firestore()
      await assertFails(setDoc(doc(alice, 'masteryRewards/alice_l9-fizzbuzzpop'), { sparks: 9999 }))
      await assertFails(getDoc(doc(alice, 'masteryRewards/alice_l9-fizzbuzzpop')))
    })
  })

  describe('checkpointRewards/{rewardId}', () => {
    it('is server-only — clients can neither read nor write the checkpoint ledger', async () => {
      const alice = testEnv.authenticatedContext('alice').firestore()
      await assertFails(setDoc(doc(alice, 'checkpointRewards/alice_cp-foundations'), { sparks: 9999 }))
      await assertFails(getDoc(doc(alice, 'checkpointRewards/alice_cp-foundations')))
    })
  })

  describe('courses/{courseId}', () => {
    it('allows public reads', async () => {
      await testEnv.withSecurityRulesDisabled(async (ctx) => {
        await setDoc(doc(ctx.firestore(), 'courses/c1'), { title: 'Loops' })
      })
      const anon = testEnv.unauthenticatedContext().firestore()
      await assertSucceeds(getDoc(doc(anon, 'courses/c1')))
    })

    it('forbids client writes', async () => {
      const alice = testEnv.authenticatedContext('alice').firestore()
      await assertFails(setDoc(doc(alice, 'courses/c1'), { title: 'Hacked' }))
    })
  })

  describe('progress/{progressId}', () => {
    it('lets a user read/write their own progress docs', async () => {
      const alice = testEnv.authenticatedContext('alice').firestore()
      await assertSucceeds(
        setDoc(doc(alice, 'progress/alice_l6-over-and-over-again'), { currentStepIndex: 0 }),
      )
      await assertSucceeds(getDoc(doc(alice, 'progress/alice_l6-over-and-over-again')))
    })

    it("forbids writing another user's progress", async () => {
      const alice = testEnv.authenticatedContext('alice').firestore()
      await assertFails(setDoc(doc(alice, 'progress/bob_l6-over-and-over-again'), { currentStepIndex: 0 }))
    })

    it("forbids reading another user's progress", async () => {
      await testEnv.withSecurityRulesDisabled(async (ctx) => {
        await setDoc(doc(ctx.firestore(), 'progress/bob_l6-over-and-over-again'), { currentStepIndex: 1 })
      })
      const alice = testEnv.authenticatedContext('alice').firestore()
      await assertFails(getDoc(doc(alice, 'progress/bob_l6-over-and-over-again')))
    })
  })
})
