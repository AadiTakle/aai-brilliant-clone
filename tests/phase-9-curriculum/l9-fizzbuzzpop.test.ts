import { describe, it, expect } from 'vitest'
import { getLesson } from '../../src/content/loader'

// [L9] FizzBuzzPop capstone rehaul for a pure beginner. The upfront
// algorithm-dictating hint is gone; the full problem spec lives ON the capstone
// step so the learner never has to navigate back; failure guidance is earned,
// one-at-a-time, and never reveals the answer.

function l9() {
  const lesson = getLesson('l9-fizzbuzzpop')
  if (!lesson) throw new Error('missing l9-fizzbuzzpop')
  return lesson
}

function rulesStep() {
  const step = l9().steps.find((s) => s.id === 'the-rules')
  if (!step || step.type !== 'article') throw new Error('the-rules article missing')
  return step
}

function capstoneStep() {
  const step = l9().steps.find((s) => s.id === 'capstone')
  if (!step || step.type !== 'python_sandbox') throw new Error('capstone sandbox missing')
  return step
}

describe('[L9] 9.1 the-rules article', () => {
  it('keeps the challenge rules and the planning checkpoint', () => {
    const article = rulesStep()
    const text = article.config.panels.map((p) => p.text ?? '').join('\n').toLowerCase()
    // The rules/challenge survive the rehaul.
    expect(text).toMatch(/fizz/)
    expect(text).toMatch(/buzz/)
    expect(text).toMatch(/pop/)
    // The planning checkpoint survives.
    const hasCheckpoint = article.config.panels.some((p) => p.activity?.kind === 'checkpoint')
    expect(hasCheckpoint).toBe(true)
  })

  it('no longer dictates the algorithm upfront (the label/empty-then-ifs hint is gone)', () => {
    const article = rulesStep()
    const allText = JSON.stringify(article.config).toLowerCase()
    // The removed panel walked the learner through building a `label`, starting
    // empty, adding Fizz/Buzz/Pop with separate ifs, then print number vs label.
    // None of that step-by-step recipe may be handed over upfront.
    expect(allText).not.toContain('start it empty')
    expect(allText).not.toContain('separate `if`')
    expect(allText).not.toContain('build a `label`')
    expect(allText).not.toMatch(/print the number when the label is still empty/)
  })
})

describe('[L9] 9.2 capstone sandbox', () => {
  it('shows the FULL problem spec on this step (no need to navigate back to 9.1)', () => {
    const step = capstoneStep()
    const prompt = step.config.prompt.toLowerCase()
    // Range.
    expect(prompt).toMatch(/1.*21|1 to 21/)
    // Each rule, by name.
    expect(prompt).toContain('fizz')
    expect(prompt).toContain('buzz')
    expect(prompt).toContain('pop')
    expect(prompt).toMatch(/multiple of .*3/)
    expect(prompt).toMatch(/5/)
    expect(prompt).toMatch(/7/)
    // The combine rule with the canonical examples.
    expect(prompt).toContain('fizzbuzz')
    expect(prompt).toContain('fizzpop')
  })

  it('does NOT pre-give the tools (loop/%/if/label) in the prompt — those are earned hints', () => {
    const step = capstoneStep()
    const prompt = step.config.prompt.toLowerCase()
    expect(prompt).not.toContain('% operator')
    expect(prompt).not.toMatch(/use a loop/)
    expect(prompt).not.toMatch(/build a label/)
  })

  it('keeps a minimal starter that grades honestly', () => {
    const step = capstoneStep()
    expect(step.config.starterCode).toContain('n = 21')
    // Starter must not contain a loop/if/% (it would defeat the construct check).
    expect(step.config.starterCode).not.toMatch(/\bfor\b|\bwhile\b/)
    expect(step.config.starterCode).not.toMatch(/\bif\b/)
    expect(step.config.starterCode).not.toContain('%')
  })

  it('keeps the required constructs and the exact expected output', () => {
    const step = capstoneStep()
    expect([...step.config.requiredConstructs].sort()).toEqual(['conditional', 'loop', 'modulo'])
    expect(step.config.testCases.length).toBeGreaterThan(0)
    expect(step.config.testCases[0].expectedStdout).toBe(
      '1\n2\nFizz\n4\nBuzz\nFizz\nPop\n8\nFizz\nBuzz\n11\nFizz\n13\nPop\nFizzBuzz\n16\n17\nFizz\n19\nBuzz\nFizzPop',
    )
  })

  it('its authored feedback never reveals the algorithm/answer', () => {
    const step = capstoneStep()
    const fb = (step.config.testCases[0].feedback ?? '').toLowerCase()
    // The old feedback spelled out `label = ""`, the three ifs, and the
    // print(i)/print(label) branch — that is the answer and must be gone.
    expect(fb).not.toContain('label = ""')
    expect(fb).not.toContain('print(i)')
    expect(fb).not.toContain('print(label)')
  })

  it('has a celebratory success message for finishing the capstone', () => {
    const step = capstoneStep()
    expect(step.config.successMessage).toBeTruthy()
    expect((step.config.successMessage ?? '').length).toBeGreaterThan(0)
  })
})
