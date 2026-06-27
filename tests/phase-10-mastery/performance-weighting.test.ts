import { describe, it, expect, vi } from 'vitest'
import { getMasteryChallenge } from '../../src/content/mastery'
import { emptyMasteryAttempt, recordRecallAnswer } from '../../src/lib/mastery/attempt'
import {
  generateApply,
  type MasteryGenerator,
  type MasteryGenRequest,
} from '../../src/lib/mastery/generateApply'
import { buildMasteryUserMessage } from '../../functions/src/masterySpec'

// [Mastery] Does the AI Apply stage actually adapt to how the learner did in
// recall, or does every learner get the same boilerplate request? The live
// model's OUTPUT can't be asserted offline, but the REQUEST we send it is
// deterministic and fully performance-derived — so we assert that:
//   1. a learner's missed concepts flow into the model request,
//   2. different recall performances produce DIFFERENT requests,
//   3. the prompt text itself names those concepts and varies with performance.
// L7 is used because it reviews three distinct concepts and is NOT forceStaticApply.

const spec = getMasteryChallenge('l7-loops-and-decisions')!

// A generator that records every request, then refuses — so generateApply falls
// back to static without running the Pyodide self-test. We only care about WHAT
// was asked of the model, which is the performance signal.
function spyGenerator() {
  const requests: MasteryGenRequest[] = []
  const gen: MasteryGenerator = {
    generate: vi.fn(async (req: MasteryGenRequest) => {
      requests.push(req)
      return { accepted: false as const, reason: 'spy' }
    }),
  }
  return { gen, requests }
}

// Simulate a recall run: answer every recall question, marking the ones whose
// concept is in `missed` as wrong on the first try (exactly what drives weighting).
function runRecall(missed: string[]) {
  let attempt = emptyMasteryAttempt()
  spec.recall.forEach((q, i) => {
    attempt = recordRecallAnswer(attempt, i, q.concept, !missed.includes(q.concept))
  })
  return attempt
}

describe('[Mastery] AI Apply is driven by recall performance, not boilerplate', () => {
  it('feeds the concept the learner missed into the model request', async () => {
    const { gen, requests } = spyGenerator()
    const attempt = runRecall(['conditional'])
    expect(attempt.missedConcepts).toEqual(['conditional'])

    await generateApply(spec, attempt.missedConcepts, { enabled: true, generator: gen })

    expect(gen.generate).toHaveBeenCalledTimes(1)
    expect(requests[0].lessonId).toBe(spec.lessonId)
    expect(requests[0].struggledConcepts).toEqual(['conditional'])
    expect(requests[0].count).toBe(1)
  })

  it('asks for two questions covering both concepts when the learner missed several', async () => {
    const { requests, gen } = spyGenerator()
    const attempt = runRecall(['loop', 'accumulator'])

    await generateApply(spec, attempt.missedConcepts, { enabled: true, generator: gen })

    expect([...requests[0].struggledConcepts].sort()).toEqual(['accumulator', 'loop'])
    expect(requests[0].count).toBe(2)
  })

  it('produces DIFFERENT requests for different performances (the anti-boilerplate check)', async () => {
    const a = spyGenerator()
    const b = spyGenerator()

    await generateApply(spec, runRecall(['conditional']).missedConcepts, {
      enabled: true,
      generator: a.gen,
    })
    await generateApply(spec, runRecall(['loop', 'accumulator']).missedConcepts, {
      enabled: true,
      generator: b.gen,
    })

    expect(a.requests[0]).not.toEqual(b.requests[0])
    expect(a.requests[0].struggledConcepts).not.toEqual(b.requests[0].struggledConcepts)
    expect(a.requests[0].count).not.toBe(b.requests[0].count)
  })

  it('still reviews the whole concept pool when the learner aces recall', async () => {
    const { requests, gen } = spyGenerator()
    const attempt = runRecall([])
    expect(attempt.missedConcepts).toEqual([])

    await generateApply(spec, attempt.missedConcepts, { enabled: true, generator: gen })

    // Aced recall -> falls back to the lesson's full concept pool (still adaptive:
    // this request differs from any targeted-miss request above).
    expect([...requests[0].struggledConcepts].sort()).toEqual(['accumulator', 'conditional', 'loop'])
    expect(requests[0].struggledConcepts).not.toEqual(['conditional'])
  })

  it('the model PROMPT names the struggled concepts and changes with performance', () => {
    const missedConditional = buildMasteryUserMessage(['conditional'], 1)
    const missedLoopAcc = buildMasteryUserMessage(['loop', 'accumulator'], 2)

    // Each prompt actually mentions the concepts it targets...
    expect(missedConditional).toContain('conditional')
    expect(missedLoopAcc).toContain('loop')
    expect(missedLoopAcc).toContain('accumulator')
    // ...the requested count is reflected...
    expect(missedConditional).toMatch(/exactly 1 .*question\b/i)
    expect(missedLoopAcc).toMatch(/exactly 2 .*questions/i)
    // ...and the two prompts are genuinely different text (not one boilerplate string).
    expect(missedConditional).not.toBe(missedLoopAcc)
  })
})
