// Client entry point for the server-authoritative Daily Challenge award. Like the
// mastery commit, this is CORE infrastructure (no OpenAI): the client reports the
// day's per-concept results and the Cloud Function updates each concept's mastery,
// grants accuracy-based Sparks (one challenge per day), and is the sole writer of
// the balance/streak. The client never writes the concept/daily stores itself.

import { httpsCallable } from 'firebase/functions'
import { functions } from '../../firebase/config'

/** One answered item the client reports for the day. */
export interface DailyResultInput {
  concept: string
  correct: boolean
  /** Fluency signal only; the server uses it for strength, NEVER for Sparks. */
  fast: boolean
}

interface CommitDailyPayload {
  day: string
  results: DailyResultInput[]
}

export interface CommitDailyResult {
  awarded: boolean
  sparksDelta: number
  totalPoints?: number
  currentStreak?: number
}

export async function commitDailyChallenge(
  day: string,
  results: DailyResultInput[],
): Promise<CommitDailyResult> {
  const fn = httpsCallable<CommitDailyPayload, CommitDailyResult>(functions, 'commitDailyChallenge')
  const res = await fn({ day, results })
  return res.data
}
