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

  describe('users/{uid}', () => {
    it('lets the owner read and write their own profile', async () => {
      const alice = testEnv.authenticatedContext('alice').firestore()
      await assertSucceeds(setDoc(doc(alice, 'users/alice'), { displayName: 'Alice' }))
      await assertSucceeds(getDoc(doc(alice, 'users/alice')))
    })

    it('forbids reading another user profile', async () => {
      await testEnv.withSecurityRulesDisabled(async (ctx) => {
        await setDoc(doc(ctx.firestore(), 'users/alice'), { displayName: 'Alice' })
      })
      const bob = testEnv.authenticatedContext('bob').firestore()
      await assertFails(getDoc(doc(bob, 'users/alice')))
    })

    it('forbids unauthenticated reads', async () => {
      const anon = testEnv.unauthenticatedContext().firestore()
      await assertFails(getDoc(doc(anon, 'users/alice')))
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
