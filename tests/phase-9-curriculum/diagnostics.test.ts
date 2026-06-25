import { describe, it, expect } from 'vitest'
import { diagnose } from '../../src/lib/grading/diagnostics'
import {
  constructHint,
  missingConstructsSource,
  usesAccumulatorSource,
} from '../../src/lib/grading/constructCheck'
import { FIZZBUZZPOP_REFERENCE } from './fixtures'

// [Phase 9] new diagnostics for conditionals / comparisons
describe('[Phase 9] diagnostics', () => {
  it('flags a missing colon from the source on a syntax error', () => {
    const hint = diagnose({ stderr: 'SyntaxError: invalid syntax', source: 'if x == 0\n    print(x)' })
    expect(hint).toMatch(/colon/i)
  })

  it('flags a missing colon directly from a modern Python message', () => {
    expect(diagnose({ stderr: "SyntaxError: expected ':'" })).toMatch(/colon/i)
  })

  it('flags = vs == inside a condition', () => {
    const hint = diagnose({ stderr: 'SyntaxError: invalid syntax', source: 'if x = 0:\n    print(x)' })
    expect(hint).toMatch(/==/)
  })

  it('does not confuse a correct == with assignment', () => {
    // No syntax error here; an output mismatch should not yield the == hint.
    const hint = diagnose({ stderr: 'SyntaxError: invalid syntax', source: 'if x == 0:\n    print(' })
    expect(hint).not.toMatch(/single `=`/)
  })

  it('flags elif/else with no preceding if', () => {
    const hint = diagnose({ stderr: 'SyntaxError: invalid syntax', source: 'else:\n    print(1)' })
    expect(hint).toMatch(/else/i)
  })

  it('explains comparing different types', () => {
    const hint = diagnose({
      stderr: "TypeError: '<' not supported between instances of 'str' and 'int'",
    })
    expect(hint).toMatch(/different types/i)
  })

  it('still handles indentation errors', () => {
    expect(diagnose({ stderr: 'IndentationError: expected an indented block' })).toMatch(/indent/i)
  })
})

// [L1] failure-type-specific hints for the first beginner steps. These only fire
// when a step kind is provided, so existing (kind-less) callers are unaffected.
describe('[L1] empty-vs-wrong output hints', () => {
  it('no kind: empty/wrong text output stays null (back-compat)', () => {
    expect(diagnose({ expected: 'Hello World!', actual: '' })).toBeNull()
    expect(diagnose({ expected: 'Hello World!', actual: 'Goodbye' })).toBeNull()
  })

  it('block step with no output tells the learner to add a print block', () => {
    const hint = diagnose({ kind: 'block', expected: 'Good morning!', actual: '' })
    expect(hint).toMatch(/print block/i)
  })

  it('python step with no output tells the learner to make it print', () => {
    const hint = diagnose({ kind: 'python', expected: 'Hello World!', actual: '' })
    expect(hint).toMatch(/print/i)
    expect(hint).not.toMatch(/print block/i)
  })

  it('wrong (non-empty) output suggests checking the printed text, without the answer', () => {
    const blockHint = diagnose({ kind: 'block', expected: 'Good morning!', actual: 'good night' })
    const pyHint = diagnose({ kind: 'python', expected: 'Hello World!', actual: 'hello there' })
    expect(blockHint).toMatch(/text/i)
    expect(pyHint).toMatch(/text/i)
    // GLOBAL RULE: never reveal the answer in a hint.
    expect(blockHint?.toLowerCase()).not.toContain('good morning')
    expect(pyHint?.toLowerCase()).not.toContain('hello world')
  })
})

// [L6] The "write a loop from scratch that prints Hi 4 times" step must produce
// DISTINCT, answer-free guidance for the common beginner failure types. The
// step uses requiredConstructs: ['loop'] so a no-loop solution is caught even
// when its output matches.
describe('[L6] print-hi-loop — distinct failure-type hints', () => {
  const expected = 'Hi\nHi\nHi\nHi'

  it('(i) no loop at all (hardcoded prints) is caught by the loop construct check', () => {
    // Stacked prints produce the right output, so output diagnostics say nothing…
    const source = 'print("Hi")\nprint("Hi")\nprint("Hi")\nprint("Hi")'
    const missing = missingConstructsSource(source, ['loop'])
    expect(missing).toEqual(['loop'])
    const hint = constructHint(missing).toLowerCase()
    expect(hint).toMatch(/loop/)
    // Answer-free: never spells out the construction.
    expect(hint).not.toContain('range(')
  })

  it('(ii) a loop that runs the wrong number of times → count-specific hint', () => {
    const hint = diagnose({ kind: 'python', expected, actual: 'Hi\nHi\nHi' })
    expect(hint).toMatch(/how many times|too few|too many/i)
    expect(hint).not.toContain('range(')
  })

  it('(iii) a flush-left body (IndentationError) → indentation hint', () => {
    const hint = diagnose({
      kind: 'python',
      expected,
      actual: '',
      stderr: 'IndentationError: expected an indented block',
    })
    expect(hint).toMatch(/indent/i)
  })

  it('(iv) right shape, wrong text → check-the-text hint (no answer)', () => {
    const hint = diagnose({ kind: 'python', expected, actual: 'Yo\nYo\nYo\nYo' })
    expect(hint).toMatch(/text/i)
    expect(hint?.toLowerCase()).not.toContain('hi')
  })
})

// [L7] accumulate-multiples-of-three: a common beginner mistake is forgetting to
// add a space, so the numbers all run together. The hint must point at the
// missing separator without revealing the expected sequence.
describe('[L7] "run together" (missing spaces) guidance, no answer', () => {
  it('flags a spaced number sequence whose output has the spaces stripped out', () => {
    const hint = diagnose({ kind: 'python', expected: '0 3 6 9 12 15', actual: '03691215' })
    expect(hint).toBeTruthy()
    expect(hint!.toLowerCase()).toMatch(/space|run together|apart|between/)
    // Answer-free: it never echoes the expected sequence.
    expect(hint).not.toContain('0 3 6 9 12 15')
  })

  it('does not misfire when the output genuinely differs (not just missing spaces)', () => {
    // Same length, different characters → not a "run together" case.
    const hint = diagnose({ kind: 'python', expected: '0 3 6 9', actual: '1 2 4 5' })
    expect(hint?.toLowerCase() ?? '').not.toMatch(/run together/)
  })
})

// [L9] accumulator/label detection: a string variable being built up across
// the loop (`x = x + ...` or `x += ...`). Needed for the capstone's earned
// "build a label" hint.
describe('[L9] accumulator (label) detection', () => {
  it('detects building a variable up with + (label = label + "Fizz")', () => {
    expect(usesAccumulatorSource('label = label + "Fizz"')).toBe(true)
  })

  it('detects the += shorthand', () => {
    expect(usesAccumulatorSource('label += "Buzz"')).toBe(true)
  })

  it('detects it inside the reference solution', () => {
    expect(usesAccumulatorSource(FIZZBUZZPOP_REFERENCE)).toBe(true)
  })

  it('a plain reassignment that is not building up is NOT an accumulator', () => {
    expect(usesAccumulatorSource('label = "Fizz"')).toBe(false)
    expect(usesAccumulatorSource('print(i)')).toBe(false)
    expect(usesAccumulatorSource('n = 21')).toBe(false)
  })

  it('does not count a keyword living only inside a string', () => {
    expect(usesAccumulatorSource('print("label = label + x")')).toBe(false)
  })
})

// [L9] capstone progressive, ONE-AT-A-TIME, element-aware failure hints. On a
// wrong submission the learner gets exactly ONE earned nudge, chosen by what is
// missing in priority order loop -> conditional -> modulo -> label, then a
// single generic "trace it" nudge when everything is present. No hint ever
// reveals the answer (the output sequence or the exact algorithm).
describe('[L9] capstone one-at-a-time element-aware hints', () => {
  // A capstone-shaped expected output: contains Fizz/Buzz/Pop by name.
  const expected = '1\n2\nFizz\n4\nBuzz\nFizzPop'

  function hintFor(source: string, opts: { stderr?: string | null } = {}) {
    return diagnose({
      kind: 'python',
      expected,
      actual: '',
      stderr: opts.stderr ?? null,
      source,
    })
  }

  const SOLUTION_LEAK = /print\(i\)|print\(label\)|label = label|fizzbuzz/i

  it('no loop -> ONLY the loop nudge', () => {
    const hint = hintFor('n = 21\nprint(n)')
    expect(hint).toMatch(/loop/i)
    expect(hint).not.toMatch(/range\(/)
    expect(hint).not.toMatch(SOLUTION_LEAK)
  })

  it('has a loop but no conditional -> ONLY the conditional nudge', () => {
    const hint = hintFor('for i in range(1, 22):\n    print(i)')
    expect(hint).toMatch(/\bif\b/i)
    expect(hint).not.toMatch(/loop/i)
    expect(hint).not.toMatch(SOLUTION_LEAK)
  })

  it('has loop + if but no modulo -> ONLY the modulo nudge', () => {
    const hint = hintFor('for i in range(1, 22):\n    if i == 3:\n        print("x")')
    expect(hint).toMatch(/%|remainder/i)
    expect(hint).not.toMatch(/\bloop\b/i)
    expect(hint).not.toMatch(SOLUTION_LEAK)
  })

  it('has loop + if + modulo but no accumulator -> ONLY the label nudge', () => {
    const source =
      'for i in range(1, 22):\n    if i % 3 == 0:\n        print("x")\n    else:\n        print(i)'
    const hint = hintFor(source)
    expect(hint).toMatch(/label/i)
    expect(hint).not.toMatch(/%|remainder/i)
    expect(hint).not.toMatch(SOLUTION_LEAK)
  })

  it('all four present but output wrong -> ONE generic trace nudge (no answer)', () => {
    const hint = hintFor(FIZZBUZZPOP_REFERENCE)
    expect(hint).toMatch(/trace/i)
    expect(hint).toMatch(/15|21/)
    expect(hint).not.toMatch(SOLUTION_LEAK)
  })

  it('only one element nudge at a time even when several are missing', () => {
    // Missing loop, conditional, modulo AND accumulator — but only the loop
    // nudge (highest priority) should come back.
    const hint = hintFor('n = 21\nprint(n)') ?? ''
    expect(hint).toMatch(/loop/i)
    expect(hint).not.toMatch(/\bif\b/i)
    expect(hint).not.toMatch(/%|remainder/i)
    expect(hint).not.toMatch(/label/i)
  })

  it('does not hijack a non-capstone python step (no Fizz/Buzz/Pop expected)', () => {
    // A plain counting step missing a loop must still get its normal output
    // diagnostics, not the capstone element hints.
    const hint = diagnose({
      kind: 'python',
      expected: '1\n2\n3\n4\n5',
      actual: '1\n2\n3\n4',
      source: 'print(1)',
    })
    expect(hint).toMatch(/too few|how many times/i)
  })
})

// [L6] count-1-to-n: off-by-one is the signature mistake once input is removed.
describe('[L6] count-1-to-n — off-by-one guidance, no answer', () => {
  const expected = '1\n2\n3\n4\n5'

  it('range(n) starts one too low → start-of-range hint', () => {
    const hint = diagnose({ kind: 'python', expected, actual: '0\n1\n2\n3\n4' })
    expect(hint).toMatch(/off by one/i)
    expect(hint).not.toContain('range(')
  })

  it('range(1, n) is one number short → too-few hint', () => {
    const hint = diagnose({ kind: 'python', expected, actual: '1\n2\n3\n4' })
    expect(hint).toMatch(/too few|stops one before/i)
    expect(hint).not.toContain('range(1, n + 1)')
  })
})
