import { describe, it, expect } from 'vitest'
import { getLesson } from '../../src/content/loader'
import { getMasteryChallenge } from '../../src/content/mastery'

// [L9] FizzBuzzPop is now the course finale Mastery Challenge. The lesson body is
// a single briefing step; the graded FizzBuzzPop capstone lives in the L9 mastery
// spec's static `applyFallback` (always authored — never AI). The full problem
// spec still ships ON the Apply question, failure guidance is still earned and
// never reveals the answer, and the required constructs + exact output are kept.

function l9() {
  const lesson = getLesson('l9-fizzbuzzpop')
  if (!lesson) throw new Error('missing l9-fizzbuzzpop')
  return lesson
}

function briefingStep() {
  const step = l9().steps.find((s) => s.id === 'the-finale-awaits')
  if (!step || step.type !== 'article') throw new Error('briefing article missing')
  return step
}

function masteryApply() {
  const spec = getMasteryChallenge('l9-fizzbuzzpop')
  if (!spec) throw new Error('missing l9 mastery spec')
  const apply = spec.applyFallback[0]
  if (!apply) throw new Error('missing l9 apply fallback')
  return { spec, apply }
}

describe('[L9] briefing step', () => {
  it('is a single ungraded article that hands off to the mastery challenge', () => {
    const lesson = l9()
    expect(lesson.steps).toHaveLength(1)
    const step = briefingStep()
    expect(step.graded).toBe(false)
    const text = step.config.panels.map((p) => p.text ?? '').join('\n').toLowerCase()
    expect(text).toMatch(/finale|mastery challenge/)
    expect(text).toContain('fizzbuzzpop')
  })
})

describe('[L9] mastery challenge spec', () => {
  it('forces the static Apply (no AI) so the finale always runs', () => {
    const { spec } = masteryApply()
    expect(spec.forceStaticApply).toBe(true)
  })

  it('shows the FULL problem spec on the Apply question', () => {
    const { apply } = masteryApply()
    const prompt = apply.prompt.toLowerCase()
    expect(prompt).toMatch(/1.*21|1 to 21/)
    expect(prompt).toContain('fizz')
    expect(prompt).toContain('buzz')
    expect(prompt).toContain('pop')
    expect(prompt).toMatch(/multiple of .*3/)
    expect(prompt).toMatch(/5/)
    expect(prompt).toMatch(/7/)
    expect(prompt).toContain('fizzbuzz')
    expect(prompt).toContain('fizzpop')
  })

  it('keeps a minimal starter that grades honestly', () => {
    const { apply } = masteryApply()
    expect(apply.starterCode).toContain('n = 21')
    expect(apply.starterCode).not.toMatch(/\bfor\b|\bwhile\b/)
    expect(apply.starterCode).not.toMatch(/\bif\b/)
    expect(apply.starterCode).not.toContain('%')
  })

  it('keeps the required constructs and the exact expected output', () => {
    const { apply } = masteryApply()
    expect([...apply.requiredConstructs].sort()).toEqual(['conditional', 'loop', 'modulo'])
    expect(apply.testCases.length).toBeGreaterThan(0)
    expect(apply.testCases[0].expectedStdout).toBe(
      '1\n2\nFizz\n4\nBuzz\nFizz\nPop\n8\nFizz\nBuzz\n11\nFizz\n13\nPop\nFizzBuzz\n16\n17\nFizz\n19\nBuzz\nFizzPop',
    )
  })

  it('its authored feedback never reveals the algorithm/answer', () => {
    const { apply } = masteryApply()
    const fb = (apply.testCases[0].feedback ?? '').toLowerCase()
    expect(fb).not.toContain('label = ""')
    expect(fb).not.toContain('print(i)')
    expect(fb).not.toContain('print(label)')
  })

  it('has a celebratory success message for finishing the capstone', () => {
    const { apply } = masteryApply()
    expect(apply.successMessage).toBeTruthy()
    expect((apply.successMessage ?? '').length).toBeGreaterThan(0)
  })

  it('reviews the course concepts that feed FizzBuzzPop in its recall MCQs', () => {
    const { spec } = masteryApply()
    expect(spec.recall.length).toBeGreaterThanOrEqual(3)
    const concepts = new Set(spec.recall.map((q) => q.concept))
    // The finale review touches the pillars of FizzBuzzPop.
    expect(concepts.has('loop')).toBe(true)
    expect(concepts.has('modulo')).toBe(true)
    expect(concepts.has('conditional')).toBe(true)
    expect(concepts.has('accumulator')).toBe(true)
  })
})
