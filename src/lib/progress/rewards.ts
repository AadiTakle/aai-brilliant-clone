// Client entry point for server-authoritative Spark awards. The learner's balance
// is mutated ONLY by the recordStepCompletion Cloud Function — the client reports
// which built-in step it completed and the server computes/records the points. The
// client never writes totalPoints/streak itself, so a balance can't be forged.

import { httpsCallable } from 'firebase/functions'
import { functions } from '../../firebase/config'

export interface RecordStepInput {
  lessonId: string
  stepId: string
  /** Wrong attempts before the solve, used server-side for points decay. */
  wrongAttempts: number
}

export interface RecordStepResult {
  pointsDelta: number
  lessonComplete: boolean
  totalPoints?: number
  currentStreak?: number
  awarded: boolean
}

export async function recordStepCompletion(input: RecordStepInput): Promise<RecordStepResult> {
  const fn = httpsCallable<RecordStepInput, RecordStepResult>(functions, 'recordStepCompletion')
  const res = await fn(input)
  return res.data
}
