// Client entry point for the server-authoritative Mastery Checkpoint award. Like
// commitMasteryCompletion, this is CORE infrastructure (no OpenAI): the client
// reports the checkpoint it passed, and the Cloud Function pays the flat one-time
// Spark award, records the pass in passedCheckpoints, and is the sole writer of
// the balance. The award is idempotent server-side, so calling it twice is safe.

import { httpsCallable } from 'firebase/functions'
import { functions } from '../../firebase/config'

interface CommitCheckpointInput {
  checkpointId: string
  passed: boolean
}

export interface CommitCheckpointResult {
  /** True when this call newly granted Sparks (first pass). */
  awarded: boolean
  /** Whether the server recorded this as a pass at all. */
  passed: boolean
  /** Flat Sparks granted on a first pass (absent on fail/idempotent calls). */
  sparksDelta?: number
  /** The learner's new lifetime balance after the award. */
  totalPoints?: number
}

export async function commitCheckpoint(
  checkpointId: string,
  passed: boolean,
): Promise<CommitCheckpointResult> {
  const fn = httpsCallable<CommitCheckpointInput, CommitCheckpointResult>(
    functions,
    'commitCheckpointCompletion',
  )
  const res = await fn({ checkpointId, passed })
  return res.data
}
