// Read-only client access to the Daily Challenge stores. Both collections are
// SERVER-OWNED (written only by the commitDailyChallenge Cloud Function); the
// client just reads them — to schedule which concepts are due, and to tell
// whether today's challenge is already done. All writes go through the callable.

import { collection, doc, getDoc, getDocs, type Firestore } from 'firebase/firestore'
import type { ConceptMastery } from './types'

/** Today's stored Daily Challenge result marker (users/{uid}/daily/{day}). */
export interface DailyChallengeRecord {
  correctCount: number
  sparks: number
}

/**
 * Every per-concept mastery record for a user, keyed by concept id. A concept
 * with no document yet simply has no entry (the scheduler treats it as brand-new
 * and highly due).
 */
export async function loadConcepts(
  db: Firestore,
  uid: string,
): Promise<Record<string, ConceptMastery>> {
  const snap = await getDocs(collection(db, 'users', uid, 'concepts'))
  const out: Record<string, ConceptMastery> = {}
  snap.forEach((d) => {
    out[d.id] = d.data() as ConceptMastery
  })
  return out
}

/**
 * Today's challenge marker if the learner has already completed it, else null.
 * `day` is the local YYYY-MM-DD the client computed.
 */
export async function loadTodayChallenge(
  db: Firestore,
  uid: string,
  day: string,
): Promise<DailyChallengeRecord | null> {
  const snap = await getDoc(doc(db, 'users', uid, 'daily', day))
  if (!snap.exists()) return null
  const data = snap.data()
  return {
    correctCount: Number(data.correctCount ?? 0),
    sparks: Number(data.sparks ?? 0),
  }
}
