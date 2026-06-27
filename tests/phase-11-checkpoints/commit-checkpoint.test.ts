import { describe, it, expect } from 'vitest'
import { awardCheckpoint, BUILTIN_CHECKPOINT_META } from '../../functions/src/checkpointMeta'

const meta = BUILTIN_CHECKPOINT_META['cp-foundations']

// [Phase 11] Server-trusted checkpoint award math: a flat, one-time grant that is
// idempotent (mirrors tests/phase-10-mastery/award-mastery.test.ts).
describe('[Phase 11] awardCheckpoint', () => {
  it('pays the flat first-pass award on a fresh pass', () => {
    expect(awardCheckpoint(meta, { passed: true, alreadyAwarded: false })).toEqual({
      awarded: true,
      sparks: 500,
    })
  })

  it('is idempotent: an already-recorded pass awards nothing more', () => {
    expect(awardCheckpoint(meta, { passed: true, alreadyAwarded: true })).toEqual({
      awarded: false,
      sparks: 0,
    })
  })

  it('awards nothing on a fail', () => {
    expect(awardCheckpoint(meta, { passed: false, alreadyAwarded: false })).toEqual({
      awarded: false,
      sparks: 0,
    })
  })

  it('awards nothing for an unknown checkpoint', () => {
    expect(awardCheckpoint(undefined, { passed: true, alreadyAwarded: false })).toEqual({
      awarded: false,
      sparks: 0,
    })
  })

  it('both built-in checkpoints carry the flat 500-Spark award', () => {
    expect(BUILTIN_CHECKPOINT_META['cp-foundations'].sparks).toBe(500)
    expect(BUILTIN_CHECKPOINT_META['cp-control-flow'].sparks).toBe(500)
  })
})
