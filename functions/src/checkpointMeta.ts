// Server-authoritative Mastery Checkpoint metadata + award math. This is the
// TRUSTED copy of each checkpoint's flat first-pass reward; the client value
// (content `sparksOnFirstPass`) is NOT trusted, exactly like BUILTIN_LESSON_META
// is the trusted source for lesson/mastery awards. Mirrors rewards.ts: pure,
// storage-free, and unit-testable.

export interface BuiltinCheckpointMeta {
  /** Flat Sparks granted the first time this checkpoint is passed. */
  sparks: number
}

// Keyed by checkpoint id; values mirror the content `sparksOnFirstPass` but are
// the authoritative numbers the Cloud Function pays out.
export const BUILTIN_CHECKPOINT_META: Record<string, BuiltinCheckpointMeta> = {
  'cp-foundations': { sparks: 500 },
  'cp-control-flow': { sparks: 500 },
}

export interface CheckpointAwardInput {
  /** Did the learner pass the checkpoint this attempt? */
  passed: boolean
  /** Has the one-time ledger already recorded this checkpoint for this user? */
  alreadyAwarded: boolean
}

export interface CheckpointAwardOutcome {
  /** True when this call newly grants Sparks (drives the celebration + ledger). */
  awarded: boolean
  /** Flat Sparks to add to the balance (0 on a fail or a repeat pass). */
  sparks: number
}

/**
 * Pure decision for a checkpoint award: a FLAT, one-time grant. Sparks flow only
 * on a fresh pass of a known checkpoint. A failed attempt, an unknown checkpoint,
 * or an already-recorded pass awards nothing — this is what makes the callable
 * idempotent. No storage, no streak math — just the award arithmetic.
 */
export function awardCheckpoint(
  meta: BuiltinCheckpointMeta | undefined,
  input: CheckpointAwardInput,
): CheckpointAwardOutcome {
  if (!meta || !input.passed || input.alreadyAwarded) {
    return { awarded: false, sparks: 0 }
  }
  return { awarded: meta.sparks > 0, sparks: meta.sparks }
}
