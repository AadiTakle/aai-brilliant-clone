import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  type Firestore,
} from 'firebase/firestore'

export interface UserProfile {
  displayName: string
  email: string
  totalPoints: number
  currentStreak: number
  lastActiveDate: string | null
  completedLessons: string[]
  /** Lessons whose Mastery Challenge the learner has cleared (gold on the map).
   *  Server-owned, written only by the commitMasteryCompletion Cloud Function. */
  masteredLessons: string[]
  /** ISO (YYYY-MM-DD) days on which the learner completed a full lesson. */
  activeDays: string[]
}

export interface UserProfileDoc extends UserProfile {
  createdAt?: unknown
}

/**
 * Creates the user's profile document at users/{uid} with default aggregate
 * stats. Merge is used so re-running on an existing account is non-destructive.
 */
export async function createUserProfile(
  db: Firestore,
  uid: string,
  data: { displayName: string; email: string },
): Promise<void> {
  const profile: UserProfileDoc = {
    displayName: data.displayName,
    email: data.email,
    totalPoints: 0,
    currentStreak: 0,
    lastActiveDate: null,
    completedLessons: [],
    masteredLessons: [],
    activeDays: [],
    createdAt: serverTimestamp(),
  }
  await setDoc(doc(db, 'users', uid), profile, { merge: true })
}

export async function getUserProfile(
  db: Firestore,
  uid: string,
): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, 'users', uid))
  return snap.exists() ? (snap.data() as UserProfile) : null
}
