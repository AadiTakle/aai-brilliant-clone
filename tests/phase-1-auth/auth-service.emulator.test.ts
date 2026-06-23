import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { signUpWithProfile, signIn, logOut } from '../../src/auth/authService'
import { getUserProfile } from '../../src/lib/users'
import { createEmulatorApp, uniqueEmail, type EmulatorApp } from '../helpers/emulatorApp'

// [Phase 1] Auth service: sign-up creates user + profile + auto-login; sign-in; logout
describe('[Phase 1] auth service (emulator)', () => {
  let env: EmulatorApp

  beforeAll(() => {
    env = createEmulatorApp('auth-service-test')
  })
  afterAll(async () => {
    await env.destroy()
  })

  it('signs up: creates an auto-logged-in user with a profile document', async () => {
    const email = uniqueEmail('signup')
    const user = await signUpWithProfile(env.auth, env.db, {
      email,
      displayName: 'Ada',
      password: 'password1',
    })

    expect(user.uid).toBeTruthy()
    expect(user.displayName).toBe('Ada')
    // Auto-login: createUserWithEmailAndPassword leaves the user signed in.
    expect(env.auth.currentUser?.uid).toBe(user.uid)

    const profile = await getUserProfile(env.db, user.uid)
    expect(profile).toMatchObject({
      displayName: 'Ada',
      email,
      totalPoints: 0,
      currentStreak: 0,
      completedLessons: [],
    })
  })

  it('rejects a duplicate email', async () => {
    const email = uniqueEmail('dup')
    await signUpWithProfile(env.auth, env.db, { email, displayName: 'One', password: 'password1' })
    await expect(
      signUpWithProfile(env.auth, env.db, { email, displayName: 'Two', password: 'password1' }),
    ).rejects.toMatchObject({ code: 'auth/email-already-in-use' })
  })

  it('signs in and logs out an existing account', async () => {
    const email = uniqueEmail('signin')
    await signUpWithProfile(env.auth, env.db, { email, displayName: 'Grace', password: 'password1' })

    await logOut(env.auth)
    expect(env.auth.currentUser).toBeNull()

    await signIn(env.auth, email, 'password1')
    expect(env.auth.currentUser?.email).toBe(email)
  })
})
