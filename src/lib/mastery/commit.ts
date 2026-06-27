// Client entry point for the server-authoritative Mastery Challenge award. Like
// recordStepCompletion, this is CORE infrastructure (no OpenAI), so it runs the
// same whether AI lesson generation is on or off: the client reports how many
// questions it answered correctly and the Cloud Function computes the Spark
// award (clamped to the lesson max), marks the lesson `mastered`, and is the sole
// writer of the balance + masteredLessons.

import { httpsCallable } from 'firebase/functions'
import { functions } from '../../firebase/config'

export interface CommitMasteryInput {
  lessonId: string
  /** Questions answered correctly (recall + apply). Server clamps to the max. */
  correctCount: number
}

export interface CommitMasteryResult {
  sparksDelta: number
  mastered: boolean
  totalPoints?: number
  currentStreak?: number
  awarded: boolean
}

export async function commitMasteryCompletion(
  input: CommitMasteryInput,
): Promise<CommitMasteryResult> {
  const fn = httpsCallable<CommitMasteryInput, CommitMasteryResult>(functions, 'commitMasteryCompletion')
  const res = await fn(input)
  return res.data
}
