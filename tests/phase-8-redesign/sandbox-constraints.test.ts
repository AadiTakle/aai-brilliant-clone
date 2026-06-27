import { describe, it, expect } from 'vitest'
import { gradePython } from '../../src/lib/grading/pythonGrader'
import {
  findDisallowedNames,
  findMissingRequiredNames,
  printsLiteralOutput,
  usesNameSource,
} from '../../src/lib/grading/constructCheck'
import type { PythonRunner } from '../../src/lib/pyodide/runner'

// A runner that reports the same stdout no matter the source, so these tests
// isolate the SOURCE-level constraint checks (output is forced to "pass").
const constRunner = (stdout: string): PythonRunner => async () => ({ stdout, error: null })

describe('[Phase 8] sandbox extra constraints — disallowedNames', () => {
  const tests = [{ stdin: '', expectedStdout: '6' }]

  it('fails a correct output that uses a banned function', async () => {
    const res = await gradePython('print(sum([1, 2, 3]))', tests, constRunner('6'), {
      disallowedNames: ['sum'],
    })
    expect(res.passed).toBe(false)
    expect(res.disallowedUsed).toEqual(['sum'])
  })

  it('passes when the banned function is avoided', async () => {
    const loop = 't = 0\nfor x in [1, 2, 3]:\n    t += x\nprint(t)'
    const res = await gradePython(loop, tests, constRunner('6'), { disallowedNames: ['sum'] })
    expect(res.passed).toBe(true)
    expect(res.disallowedUsed).toEqual([])
  })

  it('ignores a banned name that only appears inside a string', async () => {
    const res = await gradePython('print("sum")', [{ stdin: '', expectedStdout: 'sum' }], constRunner('sum'), {
      disallowedNames: ['sum'],
    })
    expect(res.disallowedUsed).toEqual([])
    expect(res.passed).toBe(true)
  })

  it('can ban a block keyword like while', async () => {
    const res = await gradePython('while False:\n    pass\nprint(6)', tests, constRunner('6'), {
      disallowedNames: ['while'],
    })
    expect(res.passed).toBe(false)
    expect(res.disallowedUsed).toEqual(['while'])
  })
})

describe('[Phase 8] sandbox extra constraints — requiredNames', () => {
  const tests = [{ stdin: '', expectedStdout: '6' }]

  it('fails a correct output that omits a required variable', async () => {
    const res = await gradePython('print(6)', tests, constRunner('6'), { requiredNames: ['total'] })
    expect(res.passed).toBe(false)
    expect(res.requiredMissing).toEqual(['total'])
  })

  it('passes when the required variable is used', async () => {
    const res = await gradePython('total = 1 + 2 + 3\nprint(total)', tests, constRunner('6'), {
      requiredNames: ['total'],
    })
    expect(res.passed).toBe(true)
    expect(res.requiredMissing).toEqual([])
  })
})

describe('[Phase 8] sandbox extra constraints — forbidHardcodedOutput', () => {
  const tests = [{ stdin: '', expectedStdout: '30' }]

  it('fails a numeric answer printed as a literal', async () => {
    const res = await gradePython('print(30)', tests, constRunner('30'), {
      forbidHardcodedOutput: true,
    })
    expect(res.passed).toBe(false)
    expect(res.hardcodedOutput).toBe(true)
  })

  it('fails a quoted answer printed as a literal', async () => {
    const res = await gradePython('print("READY")', [{ stdin: '', expectedStdout: 'READY' }], constRunner('READY'), {
      forbidHardcodedOutput: true,
    })
    expect(res.passed).toBe(false)
    expect(res.hardcodedOutput).toBe(true)
  })

  it('passes when the answer is computed into a variable', async () => {
    const res = await gradePython('x = 6 * 5\nprint(x)', tests, constRunner('30'), {
      forbidHardcodedOutput: true,
    })
    expect(res.passed).toBe(true)
    expect(res.hardcodedOutput).toBe(false)
  })

  it('does not flag hardcoding when the option is off', async () => {
    const res = await gradePython('print(30)', tests, constRunner('30'), {})
    expect(res.passed).toBe(true)
    expect(res.hardcodedOutput).toBe(false)
  })
})

describe('[Phase 8] sandbox extra constraints — failing output short-circuits', () => {
  it('does not report constraint violations when the output itself is wrong', async () => {
    const res = await gradePython('print(sum([1]))', [{ stdin: '', expectedStdout: '6' }], constRunner('1'), {
      disallowedNames: ['sum'],
      requiredNames: ['total'],
      forbidHardcodedOutput: true,
    })
    expect(res.passed).toBe(false)
    // Until the output is right, the per-test output feedback is what matters.
    expect(res.disallowedUsed).toEqual([])
    expect(res.requiredMissing).toEqual([])
    expect(res.hardcodedOutput).toBe(false)
  })
})

describe('[Phase 8] constraint detectors', () => {
  it('usesNameSource matches standalone tokens but not attributes or substrings', () => {
    expect(usesNameSource('print(sum(xs))', 'sum')).toBe(true)
    expect(usesNameSource('x = mysum(xs)', 'sum')).toBe(false)
    expect(usesNameSource('x = obj.sum()', 'sum')).toBe(false)
    expect(usesNameSource('# sum here\nprint(1)', 'sum')).toBe(false)
  })

  it('findDisallowedNames / findMissingRequiredNames report the right names', () => {
    expect(findDisallowedNames('print(sum(xs))', ['sum', 'sorted'])).toEqual(['sum'])
    expect(findMissingRequiredNames('print(total)', ['total', 'count'])).toEqual(['count'])
  })

  it('printsLiteralOutput catches bare and quoted literals only', () => {
    expect(printsLiteralOutput('print(30)', '30')).toBe(true)
    expect(printsLiteralOutput('print("READY")', 'READY')).toBe(true)
    expect(printsLiteralOutput('print(x)', '30')).toBe(false)
    expect(printsLiteralOutput('print(total)', 'READY')).toBe(false)
  })
})
